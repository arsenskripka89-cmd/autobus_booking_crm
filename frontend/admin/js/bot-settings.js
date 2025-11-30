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
  if (!token) return alert('Введіть токен');
  try {
    const res = await apiFetch('/users/bot-token', {
      method: 'PUT',
      body: JSON.stringify({ token })
    });
    document.getElementById('botSettingsMessage').style.display = 'block';
    if (res?.webhookUrl) {
      document.getElementById('botSettingsMessage').textContent = `Бота активовано успішно. Webhook: ${res.webhookUrl}`;
    }
  } catch (err) {
    alert(err.message || 'Не вдалося зберегти токен');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  ensureBotAuth();
  loadCurrentToken();
  document.getElementById('saveBotToken').addEventListener('click', saveToken);
});
