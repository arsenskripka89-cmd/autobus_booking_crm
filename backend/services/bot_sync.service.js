const { getDb } = require('../config/db');
const logger = require('../config/logger');

// Simple in-memory retry queue for phone-based syncs. This is best-effort
// and will not survive process restarts. For production, replace with
// a persistent job queue (Redis/ Bull / RabbitMQ / etc.).
const syncQueue = [];
let syncWorkerHandle = null;

async function syncBotUsersToUsers() {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM bot_users', [], async (err, rows) => {
      if (err) return reject(err);
      const results = [];
      for (const bu of rows) {
        try {
          if (!bu.phone) { results.push({ bot_user: bu.id, status: 'no_phone' }); continue; }
          // find user by phone
          const user = await new Promise((res, rej) => db.get('SELECT id FROM users WHERE phone = ? LIMIT 1', [bu.phone], (e, r) => e ? rej(e) : res(r)));
          let userId = user ? user.id : null;
          if (!userId) {
            // create user as passenger role
            await new Promise((res, rej) => db.run('INSERT INTO users (name, phone, password_hash, role) VALUES (?,?,?,?)', [bu.name || 'Passenger', bu.phone, '', 'passenger'], function (e) { e ? rej(e) : res(this.lastID); }));
            // fetch inserted id
            const newUser = await new Promise((res, rej) => db.get('SELECT id FROM users WHERE phone = ? LIMIT 1', [bu.phone], (e, r) => e ? rej(e) : res(r)));
            userId = newUser ? newUser.id : null;
            logger.info('bot_sync_created_user', { bot_user: bu.id, userId });
          }
          if (userId) {
            await new Promise((res, rej) => db.run('UPDATE bot_users SET user_id = ? WHERE id = ?', [userId, bu.id], (e) => e ? rej(e) : res()));
            results.push({ bot_user: bu.id, user_id: userId, status: 'linked' });
          } else {
            results.push({ bot_user: bu.id, status: 'failed' });
          }
        } catch (e) {
          logger.error('bot_sync_error', e.message || e);
          results.push({ bot_user: bu.id, status: 'error', error: e.message || e });
        }
      }
      resolve(results);
    });
  });
}

async function syncBotUserByPhone(phone) {
  if (!phone) return { status: 'no_phone' };
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM bot_users WHERE phone = ?', [phone], async (err, rows) => {
      if (err) return reject(err);
      const results = [];
      for (const bu of rows) {
        try {
          // find user by phone
          const user = await new Promise((res, rej) => db.get('SELECT id FROM users WHERE phone = ? LIMIT 1', [bu.phone], (e, r) => e ? rej(e) : res(r)));
          let userId = user ? user.id : null;
          if (!userId) {
            // create user as passenger role
            await new Promise((res, rej) => db.run('INSERT INTO users (name, phone, password_hash, role) VALUES (?,?,?,?)', [bu.name || 'Passenger', bu.phone, '', 'passenger'], function (e) { e ? rej(e) : res(this.lastID); }));
            const newUser = await new Promise((res, rej) => db.get('SELECT id FROM users WHERE phone = ? LIMIT 1', [bu.phone], (e, r) => e ? rej(e) : res(r)));
            userId = newUser ? newUser.id : null;
            logger.info('bot_sync_created_user', { bot_user: bu.id, userId });
          }
          if (userId) {
            await new Promise((res, rej) => db.run('UPDATE bot_users SET user_id = ? WHERE id = ?', [userId, bu.id], (e) => e ? rej(e) : res()));
            results.push({ bot_user: bu.id, user_id: userId, status: 'linked' });
          } else {
            results.push({ bot_user: bu.id, status: 'failed' });
          }
        } catch (e) {
          logger.error('bot_sync_error', e.message || e);
          results.push({ bot_user: bu.id, status: 'error', error: e.message || e });
        }
      }
      resolve(results);
    });
  });
}

// Enqueue a phone for retrying sync. Options: { maxAttempts }
function enqueuePhoneForSync(phone, options = {}) {
  if (!phone) return;
  const now = Date.now();
  const entry = { phone, attempts: 0, nextAt: now, maxAttempts: options.maxAttempts || 5 };
  syncQueue.push(entry);
  return entry;
}

// Process one queue item (if due). Returns true if work done (removed or retried), false otherwise.
async function _processOneQueueItem() {
  const now = Date.now();
  for (let i = 0; i < syncQueue.length; i++) {
    const item = syncQueue[i];
    if (item.nextAt > now) continue;
    try {
      const res = await syncBotUserByPhone(item.phone);
      // consider success if at least one linked
      const linked = res && Array.isArray(res) && res.some(r => r.status === 'linked');
      if (linked) {
        // remove from queue
        syncQueue.splice(i, 1);
        logger.info('bot_sync_queue_linked', { phone: item.phone });
        return true;
      }
      // not linked, increment attempts and schedule next
      item.attempts = (item.attempts || 0) + 1;
      if (item.attempts >= (item.maxAttempts || 5)) {
        logger.warn('bot_sync_queue_giveup', { phone: item.phone, attempts: item.attempts });
        syncQueue.splice(i, 1);
        return true;
      }
      // exponential backoff: 2^attempts * 1000ms
      const backoff = Math.pow(2, item.attempts) * 1000;
      item.nextAt = Date.now() + backoff;
      logger.info('bot_sync_queue_retry_scheduled', { phone: item.phone, attempts: item.attempts, nextInMs: backoff });
      return true;
    } catch (e) {
      item.attempts = (item.attempts || 0) + 1;
      if (item.attempts >= (item.maxAttempts || 5)) {
        logger.error('bot_sync_queue_error_giveup', { phone: item.phone, error: e.message || e });
        syncQueue.splice(i, 1);
        return true;
      }
      const backoff = Math.pow(2, item.attempts) * 1000;
      item.nextAt = Date.now() + backoff;
      logger.error('bot_sync_queue_error_retry', { phone: item.phone, error: e.message || e, nextInMs: backoff });
      return true;
    }
  }
  return false;
}

function startSyncQueueWorker(opts = {}) {
  const intervalMs = opts.intervalMs || 3000;
  if (syncWorkerHandle) return;
  syncWorkerHandle = setInterval(() => {
    // process up to a few items per tick
    (async () => {
      for (let i = 0; i < 5; i++) {
        const did = await _processOneQueueItem();
        if (!did) break;
      }
    })();
  }, intervalMs);
  logger.info('bot_sync_queue_started', { intervalMs });
}

function stopSyncQueueWorker() {
  if (syncWorkerHandle) clearInterval(syncWorkerHandle);
  syncWorkerHandle = null;
}

module.exports = { syncBotUsersToUsers, syncBotUserByPhone, enqueuePhoneForSync, startSyncQueueWorker, stopSyncQueueWorker };
