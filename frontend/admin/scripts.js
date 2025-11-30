const API_URL = window.location.origin;

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  return headers;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers: { ...(options.headers || {}), ...authHeaders() }
  });
  if (res.status === 401) {
    window.location.replace('/admin/login.html');
    return Promise.reject(new Error('Unauthorized'));
  }
  if (!res.ok) {
    const message = (await res.json().catch(() => ({}))).message || 'Помилка запиту';
    return Promise.reject(new Error(message));
  }
  return res.json().catch(() => ({}));
}

function ensureAuth() {
  if (document.body.dataset.page === 'login') return;
  if (!getToken()) {
    window.location.replace('/admin/login.html');
  }
}

function buildSidebar(activePage) {
  const sidebar = document.getElementById('sidebar');
  const content = document.querySelector('.content-area');
  if (!sidebar || !content) return;
  const navItems = [
    { page: 'dashboard', href: 'dashboard.html', label: 'Загальна статистика', icon: 'bi-speedometer2' },
    { page: 'routes', href: 'routes.html', label: 'Маршрути', icon: 'bi-signpost' },
    { page: 'trips', href: 'trips.html', label: 'Рейси', icon: 'bi-calendar-event' },
    { page: 'bookings', href: 'bookings.html', label: 'Бронювання', icon: 'bi-ticket-detailed' },
    { page: 'users', href: 'users.html', label: 'Користувачі', icon: 'bi-people' },
    { page: 'passengers', href: 'passengers.html', label: 'Пасажири', icon: 'bi-people-fill' },
    { page: 'broadcasts', href: 'broadcasts.html', label: 'Розсилки', icon: 'bi-megaphone' },
    { page: 'buses', href: 'buses.html', label: 'Автобуси', icon: 'bi-bus-front' },
    { page: 'bot-settings', href: 'bot-settings.html', label: 'Налаштування бота', icon: 'bi-robot' }
  ];

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <a class="brand" href="dashboard.html">
        <span class="bi bi-bus-front"></span>
        <span class="text">Bus CRM</span>
      </a>
      <button class="toggle-btn" id="sidebar-toggle" aria-label="Перемкнути меню">
        <i class="bi bi-list"></i>
      </button>
    </div>
    <nav class="sidebar-nav">
      ${navItems
        .map(
          (item) => `
          <a class="sidebar-link ${activePage === item.page ? 'active' : ''}" data-page="${item.page}" href="${item.href}">
            <i class="bi ${item.icon}"></i>
            <span class="label">${item.label}</span>
          </a>`
        )
        .join('')}
    </nav>
  `;

  const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
  if (collapsed) {
    sidebar.classList.add('collapsed');
    content.classList.add('collapsed');
  }

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
    localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
  });
}

async function login(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    alert(err.message || 'Невірні дані');
  }
}

async function loadDashboard() {
  const trips = await apiFetch('/trips');
  const bookingsToday = trips.length
    ? await apiFetch(`/bookings/${trips[0].id}`).catch(() => [])
    : [];
  document.getElementById('trips-count').innerText = trips.length;
  document.getElementById('bookings-today').innerText = bookingsToday.length;
  const load = trips.length ? Math.round((bookingsToday.length / (trips[0].seats || 50)) * 100) : 0;
  document.getElementById('load-factor').innerText = load + '%';
}

async function initRoutesPage() {
  const routeForm = document.getElementById('route-form');
  const routeEditForm = document.getElementById('route-edit-form');
  const typeSelect = document.getElementById('route-type');
  const parentSelect = document.getElementById('parent-route');
  const editModalEl = document.getElementById('routeEditModal');
  const editModal = new bootstrap.Modal(editModalEl);
  let routes = [];

  function renderRoutesTable() {
    const tbody = document.getElementById('routes-body');
    tbody.innerHTML = '';
    const mainRoutes = routes.filter((r) => !r.parent_route_id);
    const subRoutes = routes.filter((r) => r.parent_route_id);

    const renderRow = (route, isChild = false) => {
      const tr = document.createElement('tr');
      if (isChild) tr.classList.add('subroute-row');
      tr.innerHTML = `
        <td>${route.id}</td>
        <td>${route.from_city}</td>
        <td>${route.to_city}</td>
        <td>${route.tag || ''}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" data-id="${route.id}" data-action="edit">✏</button>
          <button class="btn btn-sm btn-outline-danger" data-id="${route.id}" data-action="delete">🗑</button>
        </td>
      `;
      tbody.appendChild(tr);
    };

    mainRoutes.forEach((main) => {
      renderRow(main, false);
      subRoutes
        .filter((s) => s.parent_route_id === main.id)
        .forEach((sub) => renderRow(sub, true));
    });
  }

  function populateParents() {
    parentSelect.innerHTML = '<option value="">Оберіть головний маршрут</option>';
    const editParent = document.getElementById('edit-parent-route');
    if (editParent) editParent.innerHTML = '<option value="">Оберіть головний маршрут</option>';
    routes
      .filter((r) => !r.parent_route_id)
      .forEach((r) => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = `${r.from_city} → ${r.to_city}`;
        parentSelect.appendChild(opt);
        if (editParent) editParent.appendChild(opt.cloneNode(true));
      });
  }

  async function loadRoutes() {
    routes = await apiFetch('/routes');
    renderRoutesTable();
    populateParents();
  }

  routeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(routeForm).entries());
    const payload = {
      from_city: formData.from_city,
      to_city: formData.to_city,
      tag: formData.tag || null,
      parent_route_id: formData.route_type === 'sub' ? formData.parent_route_id || null : null
    };
    await apiFetch('/routes', { method: 'POST', body: JSON.stringify(payload) });
    routeForm.reset();
    typeSelect.value = 'main';
    parentSelect.closest('.col-md-4').classList.add('d-none');
    await loadRoutes();
  });

  typeSelect.addEventListener('change', () => {
    const parentCol = parentSelect.closest('.col-md-4');
    if (typeSelect.value === 'sub') {
      parentCol.classList.remove('d-none');
    } else {
      parentCol.classList.add('d-none');
      parentSelect.value = '';
    }
  });

  document.getElementById('routes-body').addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    const id = e.target.dataset.id;
    if (!action || !id) return;
    if (action === 'delete') {
      if (confirm('Видалити маршрут?')) {
        await apiFetch(`/routes/${id}`, { method: 'DELETE' });
        loadRoutes();
      }
    }
    if (action === 'edit') {
      const current = routes.find((r) => String(r.id) === String(id));
      if (!current) return;
      document.getElementById('edit-route-id').value = current.id;
      document.getElementById('edit-from-city').value = current.from_city;
      document.getElementById('edit-to-city').value = current.to_city;
      document.getElementById('edit-tag').value = current.tag || '';
      document.getElementById('edit-route-type').value = current.parent_route_id ? 'sub' : 'main';
      document.getElementById('edit-parent-route').value = current.parent_route_id || '';
      document.getElementById('edit-parent-wrapper').classList.toggle('d-none', !current.parent_route_id);
      editModal.show();
    }
  });

  document.getElementById('edit-route-type').addEventListener('change', (e) => {
    const wrapper = document.getElementById('edit-parent-wrapper');
    if (e.target.value === 'sub') {
      wrapper.classList.remove('d-none');
    } else {
      wrapper.classList.add('d-none');
      document.getElementById('edit-parent-route').value = '';
    }
  });

  routeEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(routeEditForm).entries());
    const payload = {
      from_city: data.from_city,
      to_city: data.to_city,
      tag: data.tag || null,
      parent_route_id: data.route_type === 'sub' ? data.parent_route_id || null : null
    };
    await apiFetch(`/routes/${data.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    editModal.hide();
    await loadRoutes();
  });

  await loadRoutes();
}

async function initTripsPage() {
  const tripForm = document.getElementById('trip-form');
  const generateForm = document.getElementById('generate-form');
  const tripsBody = document.getElementById('trips-body');
  const trips = await apiFetch('/trips');
  tripsBody.innerHTML = trips
    .map(
      (t) => `<tr><td>${t.id}</td><td>${t.from_city} → ${t.to_city}</td><td>${t.date}</td><td>${t.time}</td><td>${t.price}</td></tr>`
    )
    .join('');

  tripForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(tripForm).entries());
    await apiFetch('/trips', { method: 'POST', body: JSON.stringify(data) });
    alert('Рейс створено');
    window.location.reload();
  });

  generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(generateForm).entries());
    await apiFetch('/trips/generate', { method: 'POST', body: JSON.stringify(data) });
    alert('Рейси згенеровано');
    window.location.reload();
  });
}

function initBookingsPage() {
  const form = document.getElementById('filter-form');
  const tbody = document.getElementById('bookings-body');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tripId = document.getElementById('tripId').value;
    if (!tripId) return alert('Вкажіть рейс');
    const data = await apiFetch(`/bookings/${tripId}`);
    tbody.innerHTML = data
      .map(
        (b) =>
          `<tr><td>${b.id}</td><td>${b.passenger_name}</td><td>${b.passenger_phone}</td><td>${b.seat_number}</td><td>${b.status}</td><td>${b.created_at}</td></tr>`
      )
      .join('');
  });
}

function initUsersPage() {
  const tbody = document.getElementById('users-body');
  apiFetch('/users').then((rows) => {
    tbody.innerHTML = rows
      .map((u) => `<tr><td>${u.id}</td><td>${u.name || ''}</td><td>${u.phone || ''}</td><td>${u.role}</td></tr>`)
      .join('');
  });
}

function initBroadcastsPage() {
  document.getElementById('broadcast-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = document.getElementById('message').value;
    if (!message) return alert('Введіть текст повідомлення');
    await apiFetch('/broadcasts/telegram', { method: 'POST', body: JSON.stringify({ message }) });
    alert('Розсилка запущена');
  });
}

function initPassengersPage() {
  const form = document.getElementById('passengers-form');
  const tbody = document.getElementById('passengers-body');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tripId = document.getElementById('tripId').value;
    if (!tripId) return alert('Вкажіть рейс');
    const data = await apiFetch(`/trips/${tripId}/passengers`);
    tbody.innerHTML = data
      .map(
        (p) =>
          `<tr><td>${p.id}</td><td>${p.passenger_name}</td><td>${p.passenger_phone}</td><td>${p.seat_number}</td><td>${p.status}</td></tr>`
      )
      .join('');
  });
}

async function initBusesPage() {
  const busForm = document.getElementById('bus-form');
  const busEditForm = document.getElementById('bus-edit-form');
  const busesBody = document.getElementById('buses-body');
  const editModal = new bootstrap.Modal(document.getElementById('busEditModal'));
  let buses = [];

  async function loadBuses() {
    buses = await apiFetch('/buses');
    busesBody.innerHTML = buses
      .map(
        (b) => `
        <tr>
          <td>${b.id}</td>
          <td>${b.bus_number}</td>
          <td>${b.driver_name}</td>
          <td>${b.seats}</td>
          <td>${b.note || ''}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${b.id}">✏</button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${b.id}">🗑</button>
          </td>
        </tr>`
      )
      .join('');
  }

  busForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(busForm).entries());
    await apiFetch('/buses', { method: 'POST', body: JSON.stringify(data) });
    busForm.reset();
    await loadBuses();
  });

  busesBody.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    const id = e.target.dataset.id;
    if (!action || !id) return;
    if (action === 'delete') {
      if (confirm('Видалити автобус?')) {
        await apiFetch(`/buses/${id}`, { method: 'DELETE' });
        loadBuses();
      }
    }
    if (action === 'edit') {
      const bus = buses.find((b) => String(b.id) === String(id));
      if (!bus) return;
      document.getElementById('edit-bus-id').value = bus.id;
      document.getElementById('edit-bus-number').value = bus.bus_number;
      document.getElementById('edit-driver-name').value = bus.driver_name;
      document.getElementById('edit-seats').value = bus.seats;
      document.getElementById('edit-note').value = bus.note || '';
      editModal.show();
    }
  });

  busEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(busEditForm).entries());
    await apiFetch(`/buses/${data.id}`, { method: 'PUT', body: JSON.stringify(data) });
    editModal.hide();
    await loadBuses();
  });

  await loadBuses();
}

function attachPageHandlers() {
  const page = document.body.dataset.page;
  if (page === 'login') {
    document.getElementById('login-form')?.addEventListener('submit', login);
    return;
  }
  ensureAuth();
  buildSidebar(page);
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'routes':
      initRoutesPage();
      break;
    case 'trips':
      initTripsPage();
      break;
    case 'bookings':
      initBookingsPage();
      break;
    case 'users':
      initUsersPage();
      break;
    case 'broadcasts':
      initBroadcastsPage();
      break;
    case 'passengers':
      initPassengersPage();
      break;
    case 'buses':
      initBusesPage();
      break;
    default:
      break;
  }
}

document.addEventListener('DOMContentLoaded', attachPageHandlers);
