const Views = (() => {
  const root = () => document.getElementById('view-root');
  const MAX_SEATS_PER_BOOKING = 9; // must match server/routes/bookings.js

  function flightCard(flight) {
    const route = `${flight.origin.code} &rarr; ${flight.destination.code}`;
    return `
      <div class="flight-card" data-testid="flight-card-${flight.id}">
        <img class="flight-card__logo" src="${flight.airlineLogo}" alt="${Utils.escapeHtml(flight.airline)} logo" />
        <div>
          <div class="flight-card__route">${route} &middot; ${Utils.escapeHtml(flight.flightNumber)}</div>
          <div class="flight-card__meta">
            ${Utils.escapeHtml(flight.airline)} &middot; ${Utils.formatDate(flight.departureTime)}, ${Utils.formatTime(flight.departureTime)} &rarr; ${Utils.formatTime(flight.arrivalTime)}
            &middot; ${Utils.formatDuration(flight.durationMinutes)} &middot; ${Utils.statusBadge(flight.status)}
          </div>
          <div class="flight-card__meta">${flight.availableSeats ?? ''} seats left</div>
        </div>
        <div>
          <div class="flight-card__price" data-testid="flight-price-${flight.id}">${Utils.formatMoney(flight.price, flight.currency)}</div>
          <div class="flight-card__actions">
            <a class="btn btn--secondary btn--sm" href="#/flights/${flight.id}" data-testid="view-flight-${flight.id}">View &amp; Book</a>
          </div>
        </div>
      </div>`;
  }

  // ---------- Login ----------
  function renderLogin() {
    root().innerHTML = `
      <div class="page" style="max-width:420px">
        <div class="page-header"><h1>Log in</h1></div>
        <div class="alert alert--info" data-testid="demo-creds-hint">
          Demo accounts. Admin: <strong>admin@flightdemo.com</strong> / <strong>Admin@123</strong><br/>
          Passenger: <strong>lucia.caminos@example.com</strong> / <strong>Passenger@123</strong>
        </div>
        <form class="card form-grid" id="login-form" data-testid="login-form" novalidate>
          <div id="login-error" role="alert"></div>
          <div>
            <label for="login-email">Email</label>
            <input type="email" id="login-email" name="email" autocomplete="username" required data-testid="login-email-input" />
          </div>
          <div>
            <label for="login-password">Password</label>
            <input type="password" id="login-password" name="password" autocomplete="current-password" required data-testid="login-password-input" />
          </div>
          <button type="submit" class="btn btn--block" data-testid="login-submit-btn">Log in</button>
        </form>
      </div>`;

    Utils.qs('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = Utils.qs('#login-email').value.trim();
      const password = Utils.qs('#login-password').value;
      const errorBox = Utils.qs('#login-error');
      errorBox.innerHTML = '';
      try {
        const { token, user } = await Api.post('/auth/login', { email, password });
        State.setSession(token, user);
        Utils.toast(`Welcome, ${user.name}`, 'success');
        window.location.hash = user.role === 'admin' ? '#/admin/dashboard' : '#/search';
      } catch (err) {
        errorBox.innerHTML = `<div class="alert alert--error" data-testid="login-error-message">${Utils.escapeHtml(err.message)}</div>`;
      }
    });
  }

  // ---------- Search ----------
  async function renderSearch() {
    root().innerHTML = `
      <div class="page">
        <div class="page-header">
          <div><h1>Search Flights</h1><p>Browse upcoming departures across our demo network.</p></div>
        </div>
        <form class="card form-row" id="search-form" data-testid="search-form">
          <div>
            <label for="search-origin">Origin</label>
            <select id="search-origin" data-testid="search-origin-select"><option value="">Any</option></select>
          </div>
          <div>
            <label for="search-destination">Destination</label>
            <select id="search-destination" data-testid="search-destination-select"><option value="">Any</option></select>
          </div>
          <div>
            <label for="search-date">Departure date</label>
            <input type="date" id="search-date" data-testid="search-date-input" />
          </div>
          <div>
            <label for="search-maxprice">Max price (USD)</label>
            <input type="number" id="search-maxprice" min="0" placeholder="Any" data-testid="search-maxprice-input" />
          </div>
          <div style="align-self:end">
            <button type="submit" class="btn btn--block" data-testid="search-submit-btn">Search</button>
          </div>
        </form>
        <div id="search-results" class="flight-list" style="margin-top:20px" data-testid="search-results" aria-live="polite"></div>
      </div>`;

    const { airports } = await Api.get('/airports');
    const originSel = Utils.qs('#search-origin');
    const destSel = Utils.qs('#search-destination');
    for (const a of airports) {
      const opt = `<option value="${a.code}">${Utils.escapeHtml(a.city)} (${a.code})</option>`;
      originSel.insertAdjacentHTML('beforeend', opt);
      destSel.insertAdjacentHTML('beforeend', opt);
    }

    async function runSearch(params) {
      const results = Utils.qs('#search-results');
      results.innerHTML = '<p>Loading&hellip;</p>';
      const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
      const { flights } = await Api.get(`/flights?${query.toString()}`);
      if (!flights.length) {
        results.innerHTML = '<div class="empty-state" data-testid="no-results">No flights match your search.</div>';
        return;
      }
      results.innerHTML = flights.map(flightCard).join('');
    }

    Utils.qs('#search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      runSearch({
        origin: Utils.qs('#search-origin').value,
        destination: Utils.qs('#search-destination').value,
        date: Utils.qs('#search-date').value,
        maxPrice: Utils.qs('#search-maxprice').value,
      });
    });

    runSearch({});
  }

  // ---------- Flight details + booking ----------
  async function renderFlightDetails(id) {
    const { flight } = await Api.get(`/flights/${id}`);
    const user = State.getUser();
    const loggedIn = State.isAuthenticated();

    const seatButtons = flight.seats
      .map(
        (s) => `<button type="button" class="seat" data-seat="${s.label}" data-testid="seat-${s.label}"
          aria-pressed="false" ${s.taken ? 'disabled aria-label="Seat ' + s.label + ' unavailable"' : 'aria-label="Seat ' + s.label + '"'}>${s.label}</button>`
      )
      .join('');

    const canBook = loggedIn && flight.status !== 'cancelled';

    root().innerHTML = `
      <div class="page">
        <div class="page-header">
          <div>
            <h1 data-testid="flight-detail-title">${flight.origin.code} &rarr; ${flight.destination.code} &middot; ${Utils.escapeHtml(flight.flightNumber)}</h1>
            <p>${Utils.escapeHtml(flight.airline)} &middot; ${Utils.formatDate(flight.departureTime)} &middot; ${Utils.statusBadge(flight.status)}</p>
          </div>
          <div class="flight-card__price">${Utils.formatMoney(flight.price, flight.currency)}</div>
        </div>

        <div class="card">
          <p>${Utils.escapeHtml(flight.description)}</p>
          <div class="form-row">
            <div><strong>Departs</strong><br/>${Utils.formatDate(flight.departureTime)}, ${Utils.formatTime(flight.departureTime)} (${flight.origin.city})</div>
            <div><strong>Arrives</strong><br/>${Utils.formatDate(flight.arrivalTime)}, ${Utils.formatTime(flight.arrivalTime)} (${flight.destination.city})</div>
            <div><strong>Duration</strong><br/>${Utils.formatDuration(flight.durationMinutes)}</div>
          </div>
        </div>

        ${!loggedIn ? `<div class="alert alert--info" data-testid="login-to-book-hint">Please <a href="#/login">log in</a> to select a seat and book this flight.</div>` : ''}
        ${flight.status === 'cancelled' ? `<div class="alert alert--error" data-testid="flight-cancelled-hint">This flight has been cancelled and cannot be booked.</div>` : ''}

        <div class="card">
          <h2>Choose your seats</h2>
          <p class="field-hint">Select one or more seats to book together (up to ${MAX_SEATS_PER_BOOKING} per booking).</p>
          <div class="seat-legend">
            <span><span class="seat-legend__swatch" style="background:#fff"></span>Available</span>
            <span><span class="seat-legend__swatch" style="background:var(--color-primary)"></span>Selected</span>
            <span><span class="seat-legend__swatch" style="background:#e5e7eb"></span>Taken</span>
          </div>
          <div class="seat-map" id="seat-map" data-testid="seat-map">${seatButtons}</div>
          <p data-testid="selected-seats-summary">
            <strong><span data-testid="selected-seats-count">0</span> seat(s) selected:</strong>
            <span data-testid="selected-seats-list">none</span>
          </p>
        </div>

        <form class="card form-grid" id="booking-form" data-testid="booking-form">
          <div id="booking-error" role="alert"></div>
          <fieldset>
            <legend>Passenger details</legend>
            <div class="form-row">
              <div>
                <label for="passenger-name">Full name</label>
                <input id="passenger-name" required value="${user ? Utils.escapeHtml(user.name) : ''}" data-testid="passenger-name-input" ${canBook ? '' : 'disabled'} />
              </div>
              <div>
                <label for="special-requests">Special requests (optional)</label>
                <input id="special-requests" placeholder="e.g. window seat" data-testid="special-requests-input" ${canBook ? '' : 'disabled'} />
              </div>
            </div>
          </fieldset>
          <fieldset>
            <legend>Payment</legend>
            <div class="form-row">
              <div>
                <label for="card-number">Card number</label>
                <input id="card-number" inputmode="numeric" maxlength="23" placeholder="4242 4242 4242 4242" required data-testid="card-number-input" ${canBook ? '' : 'disabled'} />
              </div>
              <div>
                <label for="card-expiry">Expiry (MM/YY)</label>
                <input id="card-expiry" inputmode="numeric" maxlength="5" placeholder="12/27" required data-testid="card-expiry-input" ${canBook ? '' : 'disabled'} />
              </div>
              <div>
                <label for="card-cvv">CVV</label>
                <input id="card-cvv" inputmode="numeric" placeholder="123" required data-testid="card-cvv-input" ${canBook ? '' : 'disabled'} />
              </div>
            </div>
          </fieldset>
          <input type="hidden" id="selected-seats" data-testid="selected-seats-value" />
          <button type="submit" class="btn btn--block" data-testid="confirm-booking-btn" ${canBook ? '' : 'disabled'}>
            <span data-testid="confirm-booking-btn-label">Select seats to continue</span>
          </button>
        </form>
      </div>`;

    const selectedSeats = new Set();

    function updateSummary() {
      const count = selectedSeats.size;
      const list = [...selectedSeats].sort();
      Utils.qs('#selected-seats').value = list.join(',');
      Utils.qs('[data-testid="selected-seats-count"]').textContent = String(count);
      Utils.qs('[data-testid="selected-seats-list"]').textContent = count ? list.join(', ') : 'none';
      const label = Utils.qs('[data-testid="confirm-booking-btn-label"]');
      label.textContent = count
        ? `Confirm & Pay ${Utils.formatMoney(flight.price * count, flight.currency)} (${count} seat${count > 1 ? 's' : ''})`
        : 'Select seats to continue';
    }
    updateSummary();

    Utils.qs('#card-number').addEventListener('input', (e) => {
      const input = e.target;
      const digits = input.value.replace(/\D/g, '').slice(0, 19);
      const grouped = digits.match(/.{1,4}/g)?.join(' ') ?? '';
      const cursorFromEnd = input.value.length - input.selectionEnd;
      input.value = grouped;
      input.setSelectionRange(grouped.length - cursorFromEnd, grouped.length - cursorFromEnd);
    });

    Utils.qs('#card-expiry').addEventListener('input', (e) => {
      const input = e.target;
      const digits = input.value.replace(/\D/g, '').slice(0, 4);
      const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
      const cursorFromEnd = input.value.length - input.selectionEnd;
      input.value = formatted;
      input.setSelectionRange(formatted.length - cursorFromEnd, formatted.length - cursorFromEnd);
    });

    Utils.qs('#seat-map').addEventListener('click', (e) => {
      const btn = e.target.closest('.seat');
      if (!btn || btn.disabled) return;
      const seat = btn.dataset.seat;
      if (selectedSeats.has(seat)) {
        selectedSeats.delete(seat);
        btn.setAttribute('aria-pressed', 'false');
      } else {
        if (selectedSeats.size >= MAX_SEATS_PER_BOOKING) {
          Utils.toast(`You can select at most ${MAX_SEATS_PER_BOOKING} seats per booking.`, 'error');
          return;
        }
        selectedSeats.add(seat);
        btn.setAttribute('aria-pressed', 'true');
      }
      updateSummary();
    });

    if (canBook) {
      Utils.qs('#booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const errorBox = Utils.qs('#booking-error');
        errorBox.innerHTML = '';
        if (selectedSeats.size === 0) {
          errorBox.innerHTML = `<div class="alert alert--error" data-testid="booking-error-message">Please select at least one seat.</div>`;
          return;
        }
        const payload = {
          flightId: flight.id,
          seats: [...selectedSeats],
          passengerName: Utils.qs('#passenger-name').value.trim(),
          specialRequests: Utils.qs('#special-requests').value.trim(),
          payment: {
            cardNumber: Utils.qs('#card-number').value.trim(),
            expiry: Utils.qs('#card-expiry').value.trim(),
            cvv: Utils.qs('#card-cvv').value.trim(),
          },
        };
        try {
          const { booking } = await Api.post('/bookings', payload);
          Utils.toast('Booking confirmed!', 'success');
          window.location.hash = `#/receipt/${booking.id}`;
        } catch (err) {
          errorBox.innerHTML = `<div class="alert alert--error" data-testid="booking-error-message">${Utils.escapeHtml(err.message)}</div>`;
        }
      });
    }
  }

  // ---------- Receipt ----------
  async function renderReceipt(id) {
    const { booking } = await Api.get(`/bookings/${id}`);
    const f = booking.flight;
    root().innerHTML = `
      <div class="page">
        <div class="page-header no-print"><h1>Booking Receipt</h1></div>
        <div class="card receipt" data-testid="receipt-card">
          <div class="alert alert--success" data-testid="receipt-confirmation">Booking ${Utils.escapeHtml(booking.bookingReference)} is ${Utils.escapeHtml(booking.status)}.</div>
          <div class="receipt__row"><span>Booking reference</span><strong data-testid="receipt-ref">${Utils.escapeHtml(booking.bookingReference)}</strong></div>
          <div class="receipt__row"><span>Passenger</span><span data-testid="receipt-passenger">${Utils.escapeHtml(booking.passengerName)}</span></div>
          <div class="receipt__row"><span>Flight</span><span>${f ? Utils.escapeHtml(f.flightNumber) + ' - ' + f.origin.code + ' to ' + f.destination.code : 'n/a'}</span></div>
          <div class="receipt__row"><span>Departure</span><span>${f ? Utils.formatDate(f.departureTime) + ', ' + Utils.formatTime(f.departureTime) : 'n/a'}</span></div>
          <div class="receipt__row"><span>Seat(s)</span><span data-testid="receipt-seats">${Utils.escapeHtml(booking.seats.join(', '))}</span></div>
          <div class="receipt__row"><span>Card charged</span><span>**** **** **** ${Utils.escapeHtml(booking.payment.cardLast4)}</span></div>
          <div class="receipt__row"><span>Receipt ID</span><span>${Utils.escapeHtml(booking.payment.receiptId)}</span></div>
          <div class="receipt__row receipt__total"><span>Total paid (${booking.seats.length} seat${booking.seats.length > 1 ? 's' : ''})</span><span data-testid="receipt-total">${Utils.formatMoney(booking.payment.amount, booking.payment.currency)}</span></div>
        </div>
        <div class="actions-row no-print" style="margin-top:16px">
          <button class="btn btn--secondary" onclick="window.print()" data-testid="print-receipt-btn">Print / Save as PDF</button>
          <a class="btn" href="#/my-bookings" data-testid="back-to-bookings-link">Back to My Bookings</a>
        </div>
      </div>`;
  }

  // ---------- My Bookings ----------
  async function renderMyBookings() {
    root().innerHTML = `
      <div class="page">
        <div class="page-header"><h1>My Bookings</h1></div>
        <div id="bookings-list" data-testid="bookings-list"><p>Loading&hellip;</p></div>
      </div>`;

    async function load() {
      const { bookings } = await Api.get('/bookings');
      const list = Utils.qs('#bookings-list');
      if (!bookings.length) {
        list.innerHTML = '<div class="empty-state" data-testid="no-bookings">You have no bookings yet. <a href="#/search">Search flights</a></div>';
        return;
      }
      list.innerHTML = `
        <div class="table-wrap card">
          <table data-testid="bookings-table">
            <thead><tr><th>Reference</th><th>Flight</th><th>Date</th><th>Seat(s)</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
            <tbody>
              ${bookings
                .map((b) => {
                  const f = b.flight;
                  return `<tr data-testid="booking-row-${b.id}">
                    <td>${Utils.escapeHtml(b.bookingReference)}</td>
                    <td>${f ? f.origin.code + ' &rarr; ' + f.destination.code : 'n/a'}</td>
                    <td>${f ? Utils.formatDate(f.departureTime) : ''}</td>
                    <td>${Utils.escapeHtml(b.seats.join(', '))}</td>
                    <td>${Utils.statusBadge(b.status)}</td>
                    <td>${Utils.formatMoney(b.payment.amount, b.payment.currency)}</td>
                    <td class="actions-row">
                      <a class="btn btn--secondary btn--sm" href="#/receipt/${b.id}" data-testid="view-receipt-${b.id}">Receipt</a>
                      ${b.status === 'confirmed' ? `<button class="btn btn--danger btn--sm" data-cancel="${b.id}" data-testid="cancel-booking-${b.id}">Cancel</button>` : ''}
                    </td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>`;

      Utils.qsa('[data-cancel]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Cancel this booking?')) return;
          try {
            await Api.put(`/bookings/${btn.dataset.cancel}/cancel`);
            Utils.toast('Booking cancelled', 'success');
            load();
          } catch (err) {
            Utils.toast(err.message, 'error');
          }
        });
      });
    }

    load();
  }

  return { renderLogin, renderSearch, renderFlightDetails, renderReceipt, renderMyBookings, flightCard };
})();
