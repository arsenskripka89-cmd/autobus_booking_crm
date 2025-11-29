const API_URL = window.location.origin;

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function authHeaders() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }; }

async function login(event) {
  event.preventDefault();
  const phone = document.getElementById('phone').value;
  const password = document.getElementById('password').value;
  const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password }) });
  if (!res.ok) return alert('Невірні дані');
  const data = await res.json();
  setToken(data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  window.location.href = '/admin/dashboard.html';
}

function ensureAuth() {
  if (!getToken() && !window.location.pathname.endsWith('login.html')) {
    window.location.href = '/admin/login.html';
  }
}

async function loadDashboard() {
  const trips = await fetch(`${API_URL}/trips`, { headers: authHeaders() }).then((r) => r.json());
  const bookingsToday = await fetch(`${API_URL}/bookings/${trips[0]?.id || 0}`, { headers: authHeaders() }).then((r) => r.json()).catch(() => []);
  document.getElementById('trips-count').innerText = trips.length;
  document.getElementById('bookings-today').innerText = bookingsToday.length;
  const load = trips.length ? Math.round((bookingsToday.length / (trips[0].seats_count || 50)) * 100) : 0;
  document.getElementById('load-factor').innerText = load + '%';
}

async function renderTable(endpoint, columns, tbodyId) {
  const rows = await fetch(`${API_URL}/${endpoint}`, { headers: authHeaders() }).then((r) => r.json());
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    columns.forEach((c) => {
      const td = document.createElement('td');
      td.innerText = row[c];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function submitForm(formId, endpoint, method = 'POST') {
  const form = document.getElementById(formId);
  const data = Object.fromEntries(new FormData(form).entries());
  const res = await fetch(`${API_URL}/${endpoint}`, { method, headers: authHeaders(), body: JSON.stringify(data) });
  if (!res.ok) return alert('Помилка');
  alert('Збережено');
  location.reload();
}

document.addEventListener('DOMContentLoaded', () => {
  ensureAuth();
  if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', login);
  }
  if (document.body.dataset.page === 'dashboard') loadDashboard();
  if (document.body.dataset.page === 'routes') renderTable('routes', ['id', 'from_city', 'to_city'], 'routes-body');
  if (document.body.dataset.page === 'trips') renderTable('trips', ['id', 'from_city', 'to_city', 'date', 'time', 'price'], 'trips-body');
  if (document.body.dataset.page === 'users') renderTable('users', ['id', 'name', 'phone', 'role'], 'users-body');
  if (document.body.dataset.page === 'bookings') {
    const tripIdInput = document.getElementById('tripId');
    document.getElementById('filter-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const tripId = tripIdInput.value;
      if (!tripId) return alert('Вкажіть рейс');
      const data = await fetch(`${API_URL}/bookings/${tripId}`, { headers: authHeaders() }).then((r) => r.json());
      const tbody = document.getElementById('bookings-body');
      tbody.innerHTML = '';
      data.forEach((b) => {
        const tr = document.createElement('tr');
        ['id', 'passenger_name', 'passenger_phone', 'seat_number', 'status', 'created_at'].forEach((k) => {
          const td = document.createElement('td');
          td.innerText = b[k];
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    });
  }
  if (document.body.dataset.page === 'broadcasts') {
    document.getElementById('broadcast-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('message').value;
      await fetch(`${API_URL}/broadcasts/telegram`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ message }) });
      await fetch(`${API_URL}/broadcasts/viber`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ message }) });
      alert('Розсилка запущена');
    });
  }
});
