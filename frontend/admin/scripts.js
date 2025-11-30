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

function setAdminEmail(email) {
  if (email) sessionStorage.setItem('adminEmail', email);
}

async function resolveAdminEmail() {
  const cached = sessionStorage.getItem('adminEmail');
  if (cached) return cached;
  try {
    const me = await apiFetch('/users/me');
    if (me?.email) {
      setAdminEmail(me.email);
      return me.email;
    }
  } catch (err) {
    console.warn('Unable to resolve admin email', err.message);
  }
  return '';
}

async function renderUserBadge() {
  const header = document.querySelector('.page-header');
  if (!header) return;
  const email = (await resolveAdminEmail()) || '...';
  let badge = header.querySelector('.user-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'user-badge';
    badge.innerHTML = `<i class="bi bi-person-circle"></i><span class="user-email"></span>`;
    header.appendChild(badge);
  }
  const label = badge.querySelector('.user-email');
  if (label) label.textContent = email;
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
    { page: 'bot-settings', href: 'bot-settings.html', label: 'Налаштування бота', icon: 'bi-robot' },
    { page: 'telegram-setup', href: 'telegram-setup.html', label: 'Telegram Bot Setup', icon: 'bi-book' }
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
    if (!email) throw new Error('Вкажіть email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Некоректний email');
    if (!password) throw new Error('Вкажіть пароль');
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    setAdminEmail(data.email || email);
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
  const routeSelects = [document.getElementById('trip-route-select'), document.getElementById('generate-route-select')];
  const busSelects = [document.getElementById('trip-bus-select'), document.getElementById('generate-bus-select')];
  const monthDaysContainer = document.getElementById('month-days');
  const monthlyWrapper = document.getElementById('monthly-fields');
  const weeklyWrapper = document.getElementById('weekly-fields');
  const generateErrors = document.getElementById('generate-errors');
  const warning = document.getElementById('month-days-warning');

  for (let i = 1; i <= 31; i++) {
    const label = document.createElement('label');
    label.className = 'form-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'form-check-input';
    input.name = 'daysOfMonth';
    input.value = i;
    input.addEventListener('change', () => {
      const risky = Array.from(document.querySelectorAll('input[name="daysOfMonth"]:checked')).some((el) => ['29', '30', '31'].includes(el.value));
      warning.classList.toggle('d-none', !risky);
    });
    label.appendChild(input);
    label.append(` ${i}`);
    monthDaysContainer.appendChild(label);
  }

  const toggleMode = () => {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    monthlyWrapper.classList.toggle('d-none', mode !== 'monthly');
    weeklyWrapper.classList.toggle('d-none', mode !== 'weekly');
  };
  document.querySelectorAll('input[name="mode"]').forEach((radio) => radio.addEventListener('change', toggleMode));
  toggleMode();

  async function loadTrips() {
    const trips = await apiFetch('/trips');
    tripsBody.innerHTML = trips
      .map(
        (t) =>
          `<tr><td>${t.id}</td><td>${t.from_city} → ${t.to_city}</td><td>${t.bus_number || t.bus_id || ''}</td><td>${t.date}</td><td>${t.time}</td><td>${t.price}</td></tr>`
      )
      .join('');
  }

  async function loadOptions() {
    const [routes, buses] = await Promise.all([apiFetch('/routes'), apiFetch('/buses')]);
    routeSelects.forEach((sel) => {
      sel.innerHTML = '<option value="" disabled selected>Оберіть маршрут</option>';
      routes.forEach((r) => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = `${r.id} • ${r.from_city} → ${r.to_city}`;
        sel.appendChild(opt);
      });
    });
    busSelects.forEach((sel) => {
      sel.innerHTML = '<option value="" disabled selected>Оберіть автобус</option>';
      buses.forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.id} • ${b.bus_number} (${b.seats} місць)`;
        sel.appendChild(opt);
      });
    });
  }

  await loadTrips();
  await loadOptions();

  tripForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!tripForm.reportValidity()) return;
    const data = Object.fromEntries(new FormData(tripForm).entries());
    await apiFetch('/trips', { method: 'POST', body: JSON.stringify(data) });
    alert('Рейс створено');
    await loadTrips();
  });

  generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    generateErrors.textContent = '';
    if (!generateForm.reportValidity()) return;
    const formData = new FormData(generateForm);
    const mode = formData.get('mode') || 'weekly';
    const base = {
      route_id: formData.get('route_id'),
      bus_id: formData.get('bus_id'),
      startDate: formData.get('startDate'),
      time: formData.get('time'),
      price: formData.get('price'),
      mode
    };
    try {
      if (!base.route_id || !base.bus_id || !base.startDate || !base.time || !base.price) {
        throw new Error('Заповніть усі обовʼязкові поля');
      }
      let payload = { ...base };
      if (mode === 'weekly') {
        const weekdays = formData.getAll('weekdays');
        if (!weekdays.length) throw new Error('Оберіть дні тижня');
        payload = {
          ...payload,
          weekdays,
          weeksCount: formData.get('weeksCount') || undefined,
          endDate: formData.get('endDate') || undefined
        };
        if (!payload.weeksCount && !payload.endDate) {
          throw new Error('Вкажіть кількість тижнів або кінцеву дату');
        }
      } else {
        const daysOfMonth = formData.getAll('daysOfMonth');
        if (!daysOfMonth.length) throw new Error('Оберіть дні місяця');
        payload = {
          ...payload,
          daysOfMonth,
          monthsCount: formData.get('monthsCount') || undefined,
          endDate: formData.get('monthlyEndDate') || undefined
        };
        if (!payload.monthsCount && !payload.endDate) {
          throw new Error('Вкажіть кількість місяців або кінцеву дату');
        }
      }
      const result = await apiFetch('/trips/generate', { method: 'POST', body: JSON.stringify(payload) });
      alert(`Рейси згенеровано (${result.inserted || 0})`);
      await loadTrips();
    } catch (err) {
      generateErrors.textContent = err.message || 'Помилка генерації';
    }
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
  const form = document.getElementById('user-form');
  const resetBtn = document.getElementById('reset-user-form');

  async function loadUsers() {
    const rows = await apiFetch('/users');
    tbody.innerHTML = rows
      .map(
        (u) => `
        <tr>
          <td>${u.id}</td>
          <td>${u.name || ''}</td>
          <td>${u.email || ''}</td>
          <td>${u.phone || ''}</td>
          <td>${u.telegram_username ? '@' + u.telegram_username : ''}${u.telegram_id ? `<div class="text-muted small">${u.telegram_id}</div>` : ''}</td>
          <td>${u.role}</td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${u.id}">✏</button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${u.id}">🗑</button>
          </td>
        </tr>`
      )
      .join('');
  }

  function resetForm() {
    form.reset();
    document.getElementById('user-id').value = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(form).entries());
    const payload = { ...formData };
    if (!payload.role) payload.role = 'user';
    if (!payload.email) delete payload.email;
    if (!payload.password) delete payload.password;
    const id = payload.id;
    delete payload.id;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/users/${id}` : '/users';
    await apiFetch(url, { method, body: JSON.stringify(payload) });
    resetForm();
    await loadUsers();
  });

  resetBtn?.addEventListener('click', resetForm);

  tbody.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    const id = e.target.dataset.id;
    if (!action || !id) return;
    if (action === 'delete') {
      if (!confirm('Видалити користувача?')) return;
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      await loadUsers();
    }
    if (action === 'edit') {
      const user = await apiFetch(`/users/${id}`);
      document.getElementById('user-id').value = user.id;
      document.getElementById('user-name').value = user.name || '';
      document.getElementById('user-email').value = user.email || '';
      document.getElementById('user-phone').value = user.phone || '';
      document.getElementById('user-telegram-username').value = user.telegram_username || '';
      document.getElementById('user-role').value = user.role || 'user';
      document.getElementById('user-password').value = '';
    }
  });

  loadUsers();
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
  renderUserBadge();
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
    case 'telegram-setup':
      // static instructions page
      break;
    default:
      break;
  }
}

document.addEventListener('DOMContentLoaded', attachPageHandlers);
