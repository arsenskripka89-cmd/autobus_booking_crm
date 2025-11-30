function ensureBotAuth() {
  if (typeof getToken === 'function' && !getToken()) {
    window.location.href = '/admin/login.html';
  }
}

async function loadCurrentToken() {
  try {
    const user = await apiFetch('/users/me');
    if (user?.telegram_token) {
      document.getElementById('botToken').value = user.telegram_token;
    }
  } catch (err) {
    console.error(err);
  }
}

async function saveToken() {
  const token = document.getElementById('botToken').value.trim();
  const successBox = document.getElementById('botSettingsMessage');
  const errorBox = document.getElementById('botSettingsError');
  successBox.style.display = 'none';
  errorBox.style.display = 'none';

  if (!token) return alert('Введіть токен');
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    errorBox.textContent = 'Невірний формат токена. Формат: 123456:ABCDEF';
    errorBox.style.display = 'block';
    return;
  }
  try {
    const res = await apiFetch('/users/bot-token', {
      method: 'PUT',
      body: JSON.stringify({ token })
    });
    successBox.textContent = res?.message || 'Токен збережено';
    if (res?.webhookUrl) successBox.textContent += ` Webhook: ${res.webhookUrl}`;
    successBox.style.display = 'block';
  } catch (err) {
    errorBox.textContent = err.message || 'Не вдалося зберегти токен';
    errorBox.style.display = 'block';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  ensureBotAuth();
  loadCurrentToken();
  document.getElementById('saveBotToken').addEventListener('click', saveToken);
});
