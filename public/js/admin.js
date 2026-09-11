const Admin = (() => {
  const root = () => document.getElementById('view-root');

  const AIRLINE_LOGOS = [
    ['/images/airlines/vicecity.svg', 'Vice City Air'],
    ['/images/airlines/pacific.svg', 'Pacific Air'],
    ['/images/airlines/aerowave.svg', 'AeroWave'],
    ['/images/airlines/northern.svg', 'Northern Wings'],
    ['/images/airlines/continental.svg', 'Continental Express'],
  ];

  // ---------- Dashboard ----------
  async function renderDashboard() {
    root().innerHTML = `
      <div class="page">
        <div class="page-header"><h1>Admin Dashboard</h1></div>
        <div id="dash-stats" class="stats-grid" data-testid="dashboard-stats"><p>Loading&hellip;</p></div>
        <div class="card">
          <h2>Top Destinations</h2>
          <div id="dash-destinations" data-testid="dashboard-top-destinations"></div>
        </div>
        <div class="card">
          <h2>Recent Bookings</h2>
          <p class="field-hint">Includes passenger-submitted "special requests" text.</p>
          <div id="dash-bookings" data-testid="dashboard-recent-bookings"></div>
        </div>
      </div>`;

    const stats = await Api.get('/dashboard/stats');
    Utils.qs('#dash-stats').innerHTML = `
      <div class="stat-card"><div class="stat-card__value" data-testid="stat-total-flights">${stats.totalFlights}</div><div class="stat-card__label">Total flights</div></div>
      <div class="stat-card"><div class="stat-card__value" data-testid="stat-total-bookings">${stats.totalBookings}</div><div class="stat-card__label">Total bookings</div></div>
      <div class="stat-card"><div class="stat-card__value" data-testid="stat-confirmed-bookings">${stats.confirmedBookings}</div><div class="stat-card__label">Confirmed bookings</div></div>
      <div class="stat-card"><div class="stat-card__value" data-testid="stat-revenue">${Utils.formatMoney(stats.totalRevenue, 'USD')}</div><div class="stat-card__label">Total revenue</div></div>
      <div class="stat-card"><div class="stat-card__value" data-testid="stat-passengers">${stats.totalPassengers}</div><div class="stat-card__label">Passengers</div></div>
    `;

    Utils.qs('#dash-destinations').innerHTML = stats.topDestinations.length
      ? `<table><thead><tr><th>Destination</th><th>Bookings</th></tr></thead><tbody>${stats.topDestinations
          .map((d) => `<tr><td>${Utils.escapeHtml(d.destination)}</td><td>${d.count}</td></tr>`)
          .join('')}</tbody></table>`
      : '<p>No confirmed bookings yet.</p>';

    const { bookings } = await Api.get('/bookings');
    const recent = bookings.slice(-10).reverse();
    Utils.qs('#dash-bookings').innerHTML = recent.length
      ? `<div class="table-wrap"><table data-testid="admin-bookings-table"><thead><tr><th>Reference</th><th>Passenger</th><th>Status</th><th>Special requests</th></tr></thead><tbody>
          ${recent
            .map(
              // INTENTIONAL BAD PRACTICE (REQUIREMENTS.md item B3 - stored XSS):
              // specialRequests is passenger-controlled free text and is inserted
              // here via innerHTML without escaping. A hardened implementation
              // would use Utils.escapeHtml(b.specialRequests) like every other
              // field in this app does.
              (b) => `<tr data-testid="admin-booking-row-${b.id}"><td>${b.bookingReference}</td><td>${b.passengerName}</td><td>${Utils.statusBadge(b.status)}</td><td class="special-requests-cell">${b.specialRequests || '<em>none</em>'}</td></tr>`
            )
            .join('')}
        </tbody></table></div>`
      : '<p>No bookings yet.</p>';
  }

  // ---------- Flights management ----------
  async function renderFlights() {
    root().innerHTML = `
      <div class="page">
        <div class="page-header">
          <div><h1>Manage Flights</h1></div>
          <a class="btn" href="#/admin/flights/new" data-testid="add-flight-btn">+ Add Flight</a>
        </div>
        <div id="admin-flights-list" data-testid="admin-flights-list"><p>Loading&hellip;</p></div>
      </div>`;

    async function load() {
      const { flights } = await Api.get('/flights');
      const list = Utils.qs('#admin-flights-list');
      list.innerHTML = `<div class="table-wrap card"><table data-testid="admin-flights-table">
        <thead><tr><th>Flight</th><th>Route</th><th>Departs</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${flights
            .map(
              (f) => `<tr data-testid="admin-flight-row-${f.id}">
                <td>${Utils.escapeHtml(f.flightNumber)}<br/><span class="field-hint">${Utils.escapeHtml(f.airline)}</span></td>
                <td>${f.origin.code} &rarr; ${f.destination.code}</td>
                <td>${Utils.formatDate(f.departureTime)}</td>
                <td>${Utils.formatMoney(f.price, f.currency)}</td>
                <td>${Utils.statusBadge(f.status)}</td>
                <td class="actions-row">
                  <a class="btn btn--secondary btn--sm" href="#/admin/flights/${f.id}/edit" data-testid="edit-flight-${f.id}">Edit</a>
                  <button class="btn btn--danger btn--sm" data-delete-flight="${f.id}" data-testid="delete-flight-${f.id}">Delete</button>
                </td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table></div>`;

      Utils.qsa('[data-delete-flight]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Delete this flight? This cannot be undone.')) return;
          try {
            await Api.del(`/flights/${btn.dataset.deleteFlight}`);
            Utils.toast('Flight deleted', 'success');
            load();
          } catch (err) {
            Utils.toast(err.message, 'error');
          }
        });
      });
    }

    load();
  }

  function toLocalInputValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function renderFlightForm(id) {
    const isEdit = Boolean(id);
    const { airports } = await Api.get('/airports');
    let flight = null;
    if (isEdit) {
      ({ flight } = await Api.get(`/flights/${id}`));
    }

    const airportOptions = (selectedCode) =>
      airports.map((a) => `<option value="${a.code}" ${flight && selectedCode === a.code ? 'selected' : ''}>${Utils.escapeHtml(a.city)} (${a.code})</option>`).join('');

    const airlineOptions = AIRLINE_LOGOS.map(
      ([path, name]) => `<option value="${path}" ${flight && flight.airlineLogo === path ? 'selected' : ''}>${name}</option>`
    ).join('');

    root().innerHTML = `
      <div class="page" style="max-width:720px">
        <div class="page-header"><h1>${isEdit ? 'Edit Flight' : 'Add Flight'}</h1></div>
        <form class="card form-grid" id="flight-form" data-testid="flight-form">
          <div id="flight-form-error" role="alert"></div>
          <div class="form-row">
            <div><label for="f-number">Flight number</label><input id="f-number" required value="${flight ? Utils.escapeHtml(flight.flightNumber) : ''}" data-testid="flight-number-input" /></div>
            <div><label for="f-airline">Airline</label><select id="f-airline" required data-testid="flight-airline-select">${airlineOptions}</select></div>
          </div>
          <div class="form-row">
            <div><label for="f-origin">Origin</label><select id="f-origin" required data-testid="flight-origin-select">${airportOptions(flight && flight.origin.code)}</select></div>
            <div><label for="f-destination">Destination</label><select id="f-destination" required data-testid="flight-destination-select">${airportOptions(flight && flight.destination.code)}</select></div>
            <div><label for="f-status">Status</label>
              <select id="f-status" data-testid="flight-status-select">
                <option value="on-time" ${flight && flight.status === 'on-time' ? 'selected' : ''}>On time</option>
                <option value="delayed" ${flight && flight.status === 'delayed' ? 'selected' : ''}>Delayed</option>
                <option value="cancelled" ${flight && flight.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div><label for="f-departure">Departure (local time)</label><input type="datetime-local" id="f-departure" required value="${toLocalInputValue(flight && flight.departureTime)}" data-testid="flight-departure-input" /></div>
            <div><label for="f-duration">Duration (minutes)</label><input type="number" id="f-duration" min="10" required value="${flight ? flight.durationMinutes : 120}" data-testid="flight-duration-input" /></div>
            <div><label for="f-price">Price (USD)</label><input type="number" id="f-price" min="1" step="1" required value="${flight ? flight.price : ''}" data-testid="flight-price-input" /></div>
          </div>
          <div class="form-row">
            <div><label for="f-capacity">Capacity (multiple of 4)</label><input type="number" id="f-capacity" min="4" step="4" required value="${flight ? flight.capacity : 24}" data-testid="flight-capacity-input" /></div>
          </div>
          <div>
            <label for="f-description">Description</label>
            <textarea id="f-description" rows="3" data-testid="flight-description-input">${flight ? Utils.escapeHtml(flight.description) : ''}</textarea>
          </div>
          <div class="actions-row">
            <button type="submit" class="btn" data-testid="save-flight-btn">${isEdit ? 'Save changes' : 'Add flight'}</button>
            <a class="btn btn--secondary" href="#/admin/flights" data-testid="cancel-flight-btn">Cancel</a>
          </div>
        </form>
      </div>`;

    Utils.qs('#flight-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = Utils.qs('#flight-form-error');
      errorBox.innerHTML = '';

      const origin = airports.find((a) => a.code === Utils.qs('#f-origin').value);
      const destination = airports.find((a) => a.code === Utils.qs('#f-destination').value);
      const departureTime = new Date(Utils.qs('#f-departure').value).toISOString();
      const durationMinutes = Number(Utils.qs('#f-duration').value);
      const arrivalTime = new Date(new Date(departureTime).getTime() + durationMinutes * 60000).toISOString();

      const airlineLogo = Utils.qs('#f-airline').value;
      const airline = AIRLINE_LOGOS.find(([path]) => path === airlineLogo)[1];

      const payload = {
        flightNumber: Utils.qs('#f-number').value.trim(),
        airline,
        airlineLogo,
        origin,
        destination,
        status: Utils.qs('#f-status').value,
        departureTime,
        arrivalTime,
        durationMinutes,
        price: Number(Utils.qs('#f-price').value),
        capacity: Number(Utils.qs('#f-capacity').value),
        description: Utils.qs('#f-description').value.trim(),
        image: `/images/destinations/${destination.code.toLowerCase()}.svg`,
      };

      try {
        if (isEdit) {
          await Api.put(`/flights/${id}`, payload);
          Utils.toast('Flight updated', 'success');
        } else {
          await Api.post('/flights', payload);
          Utils.toast('Flight added', 'success');
        }
        window.location.hash = '#/admin/flights';
      } catch (err) {
        errorBox.innerHTML = `<div class="alert alert--error" data-testid="flight-form-error-message">${Utils.escapeHtml(err.message)}</div>`;
      }
    });
  }

  // ---------- Users management ----------
  async function renderUsers() {
    root().innerHTML = `
      <div class="page">
        <div class="page-header">
          <div><h1>Manage Users</h1></div>
        </div>
        <form class="card form-grid" id="user-form" data-testid="user-form">
          <h2 id="user-form-title">Add User</h2>
          <div id="user-form-error" role="alert"></div>
          <input type="hidden" id="u-id" />
          <div class="form-row">
            <div><label for="u-name">Name</label><input id="u-name" required data-testid="user-name-input" /></div>
            <div><label for="u-email">Email</label><input type="email" id="u-email" required data-testid="user-email-input" /></div>
            <div><label for="u-role">Role</label>
              <select id="u-role" data-testid="user-role-select">
                <option value="passenger">Passenger</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div><label for="u-passport">Passport number (optional)</label><input id="u-passport" data-testid="user-passport-input" /></div>
            <div><label for="u-password">Password <span id="u-password-hint" class="field-hint"></span></label><input type="password" id="u-password" data-testid="user-password-input" /></div>
          </div>
          <div class="actions-row">
            <button type="submit" class="btn" id="save-user-btn" data-testid="save-user-btn">Add user</button>
            <button type="button" class="btn btn--secondary" id="user-form-reset" data-testid="reset-user-form-btn" hidden>Cancel edit</button>
          </div>
        </form>
        <div class="card" style="margin-top:16px">
          <h2>All Users</h2>
          <div id="users-list" data-testid="users-list"><p>Loading&hellip;</p></div>
        </div>
      </div>`;

    function resetForm() {
      Utils.qs('#user-form').reset();
      Utils.qs('#u-id').value = '';
      Utils.qs('#user-form-title').textContent = 'Add User';
      Utils.qs('#save-user-btn').textContent = 'Add user';
      Utils.qs('#u-password-hint').textContent = '(min 8 characters)';
      Utils.qs('#u-password').required = true;
      Utils.qs('#user-form-reset').hidden = true;
    }
    resetForm();

    async function load() {
      const { users } = await Api.get('/users');
      Utils.qs('#users-list').innerHTML = `<div class="table-wrap"><table data-testid="users-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          ${users
            .map(
              (u) => `<tr data-testid="user-row-${u.id}">
                <td>${Utils.escapeHtml(u.name)}</td>
                <td>${Utils.escapeHtml(u.email)}</td>
                <td><span class="badge badge--${u.role}">${u.role}</span></td>
                <td class="actions-row">
                  <button class="btn btn--secondary btn--sm" data-edit-user='${JSON.stringify(u).replace(/'/g, '&#39;')}' data-testid="edit-user-${u.id}">Edit</button>
                  <button class="btn btn--danger btn--sm" data-delete-user="${u.id}" data-testid="delete-user-${u.id}">Delete</button>
                </td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table></div>`;

      Utils.qsa('[data-edit-user]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const u = JSON.parse(btn.dataset.editUser);
          Utils.qs('#u-id').value = u.id;
          Utils.qs('#u-name').value = u.name;
          Utils.qs('#u-email').value = u.email;
          Utils.qs('#u-role').value = u.role;
          Utils.qs('#u-passport').value = u.passportNumber || '';
          Utils.qs('#u-password').value = '';
          Utils.qs('#u-password').required = false;
          Utils.qs('#u-password-hint').textContent = '(leave blank to keep current password)';
          Utils.qs('#user-form-title').textContent = `Edit User: ${u.name}`;
          Utils.qs('#save-user-btn').textContent = 'Save changes';
          Utils.qs('#user-form-reset').hidden = false;
          Utils.qs('#user-form').scrollIntoView({ behavior: 'smooth' });
        });
      });

      Utils.qsa('[data-delete-user]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Delete this user?')) return;
          try {
            await Api.del(`/users/${btn.dataset.deleteUser}`);
            Utils.toast('User deleted', 'success');
            load();
          } catch (err) {
            Utils.toast(err.message, 'error');
          }
        });
      });
    }

    Utils.qs('#user-form-reset').addEventListener('click', resetForm);

    Utils.qs('#user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = Utils.qs('#user-form-error');
      errorBox.innerHTML = '';
      const id = Utils.qs('#u-id').value;
      const payload = {
        name: Utils.qs('#u-name').value.trim(),
        email: Utils.qs('#u-email').value.trim(),
        role: Utils.qs('#u-role').value,
        passportNumber: Utils.qs('#u-passport').value.trim(),
      };
      const password = Utils.qs('#u-password').value;
      if (password) payload.password = password;

      try {
        if (id) {
          await Api.put(`/users/${id}`, payload);
          Utils.toast('User updated', 'success');
        } else {
          await Api.post('/users', payload);
          Utils.toast('User added', 'success');
        }
        resetForm();
        load();
      } catch (err) {
        errorBox.innerHTML = `<div class="alert alert--error" data-testid="user-form-error-message">${Utils.escapeHtml(err.message)}</div>`;
      }
    });

    load();
  }

  // ---------- Airports management ----------
  async function renderAirports() {
    root().innerHTML = `
      <div class="page">
        <div class="page-header">
          <div><h1>Manage Airports</h1></div>
        </div>
        <form class="card form-grid" id="airport-form" data-testid="airport-form">
          <h2 id="airport-form-title">Add Airport</h2>
          <div id="airport-form-error" role="alert"></div>
          <input type="hidden" id="a-original-code" />
          <div class="form-row">
            <div><label for="a-code">IATA code</label><input id="a-code" required maxlength="3" style="text-transform:uppercase" data-testid="airport-code-input" /></div>
            <div><label for="a-city">City</label><input id="a-city" required data-testid="airport-city-input" /></div>
            <div><label for="a-country">Country</label><input id="a-country" required data-testid="airport-country-input" /></div>
          </div>
          <div class="actions-row">
            <button type="submit" class="btn" id="save-airport-btn" data-testid="save-airport-btn">Add airport</button>
            <button type="button" class="btn btn--secondary" id="airport-form-reset" data-testid="reset-airport-form-btn" hidden>Cancel edit</button>
          </div>
        </form>
        <div class="card" style="margin-top:16px">
          <h2>All Airports</h2>
          <div id="airports-list" data-testid="airports-list"><p>Loading&hellip;</p></div>
        </div>
      </div>`;

    function resetForm() {
      Utils.qs('#airport-form').reset();
      Utils.qs('#a-original-code').value = '';
      Utils.qs('#airport-form-title').textContent = 'Add Airport';
      Utils.qs('#save-airport-btn').textContent = 'Add airport';
      Utils.qs('#airport-form-reset').hidden = true;
    }
    resetForm();

    async function load() {
      const { airports } = await Api.get('/airports');
      Utils.qs('#airports-list').innerHTML = `<div class="table-wrap"><table data-testid="airports-table">
        <thead><tr><th>Code</th><th>City</th><th>Country</th><th>Actions</th></tr></thead>
        <tbody>
          ${airports
            .map(
              (a) => `<tr data-testid="airport-row-${a.code}">
                <td>${Utils.escapeHtml(a.code)}</td>
                <td>${Utils.escapeHtml(a.city)}</td>
                <td>${Utils.escapeHtml(a.country)}</td>
                <td class="actions-row">
                  <button class="btn btn--secondary btn--sm" data-edit-airport='${JSON.stringify(a).replace(/'/g, '&#39;')}' data-testid="edit-airport-${a.code}">Edit</button>
                  <button class="btn btn--danger btn--sm" data-delete-airport="${a.code}" data-testid="delete-airport-${a.code}">Delete</button>
                </td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table></div>`;

      Utils.qsa('[data-edit-airport]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const a = JSON.parse(btn.dataset.editAirport);
          Utils.qs('#a-original-code').value = a.code;
          Utils.qs('#a-code').value = a.code;
          Utils.qs('#a-city').value = a.city;
          Utils.qs('#a-country').value = a.country;
          Utils.qs('#airport-form-title').textContent = `Edit Airport: ${a.code}`;
          Utils.qs('#save-airport-btn').textContent = 'Save changes';
          Utils.qs('#airport-form-reset').hidden = false;
          Utils.qs('#airport-form').scrollIntoView({ behavior: 'smooth' });
        });
      });

      Utils.qsa('[data-delete-airport]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Delete this airport?')) return;
          try {
            await Api.del(`/airports/${btn.dataset.deleteAirport}`);
            Utils.toast('Airport deleted', 'success');
            load();
          } catch (err) {
            Utils.toast(err.message, 'error');
          }
        });
      });
    }

    Utils.qs('#airport-form-reset').addEventListener('click', resetForm);

    Utils.qs('#airport-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = Utils.qs('#airport-form-error');
      errorBox.innerHTML = '';
      const originalCode = Utils.qs('#a-original-code').value;
      const payload = {
        code: Utils.qs('#a-code').value.trim().toUpperCase(),
        city: Utils.qs('#a-city').value.trim(),
        country: Utils.qs('#a-country').value.trim(),
      };

      try {
        if (originalCode) {
          await Api.put(`/airports/${originalCode}`, payload);
          Utils.toast('Airport updated', 'success');
        } else {
          await Api.post('/airports', payload);
          Utils.toast('Airport added', 'success');
        }
        resetForm();
        load();
      } catch (err) {
        errorBox.innerHTML = `<div class="alert alert--error" data-testid="airport-form-error-message">${Utils.escapeHtml(err.message)}</div>`;
      }
    });

    load();
  }

  return { renderDashboard, renderFlights, renderFlightForm, renderUsers, renderAirports };
})();
