const API_URL = window.location.origin;

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

function ensureAuth() {
  if (!getToken()) {
    window.location.href = '/admin/login.html';
  }
}

async function loadCurrentToken() {
  const res = await fetch(`${API_URL}/users/me`, { headers: authHeaders() });
  if (res.status === 401) {
    return window.location.replace('/admin/login.html');
  }
  const user = await res.json();
  if (user?.telegram_token) {
    document.getElementById('botToken').value = user.telegram_token;
  }
}

async function saveToken() {
  const token = document.getElementById('botToken').value.trim();
  if (!token) return alert('Введіть токен');
  const res = await fetch(`${API_URL}/users/bot-token`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ token })
  });
  if (res.status === 401) {
    return window.location.replace('/admin/login.html');
  }
  if (!res.ok) {
    return alert('Не вдалося зберегти токен');
  }
  document.getElementById('botSettingsMessage').style.display = 'block';
}

window.addEventListener('DOMContentLoaded', () => {
  ensureAuth();
  loadCurrentToken();
  document.getElementById('saveBotToken').addEventListener('click', saveToken);
});
