const Router = (() => {
  const routes = [
    { path: '/login', view: () => Views.renderLogin(), auth: 'guest' },
    { path: '/search', view: () => Views.renderSearch(), auth: 'any' },
    { path: '/flights/:id', view: (p) => Views.renderFlightDetails(p.id), auth: 'any' },
    { path: '/receipt/:id', view: (p) => Views.renderReceipt(p.id), auth: 'user' },
    { path: '/my-bookings', view: () => Views.renderMyBookings(), auth: 'user' },
    { path: '/admin/dashboard', view: () => Admin.renderDashboard(), auth: 'admin' },
    { path: '/admin/flights', view: () => Admin.renderFlights(), auth: 'admin' },
    { path: '/admin/flights/new', view: () => Admin.renderFlightForm(null), auth: 'admin' },
    { path: '/admin/flights/:id/edit', view: (p) => Admin.renderFlightForm(p.id), auth: 'admin' },
    { path: '/admin/users', view: () => Admin.renderUsers(), auth: 'admin' },
    { path: '/admin/airports', view: () => Admin.renderAirports(), auth: 'admin' },
  ];

  function currentPath() {
    const path = (window.location.hash || '#/search').slice(1) || '/search';
    // Bare "/" (e.g. the brand/home link, or manually visiting "#/") has no
    // matching route of its own - treat it the same as no hash at all.
    return path === '/' ? '/search' : path;
  }

  function matchRoute(path) {
    const pathSegments = path.split('?')[0].split('/').filter(Boolean);
    for (const route of routes) {
      const routeSegments = route.path.split('/').filter(Boolean);
      if (routeSegments.length !== pathSegments.length) continue;
      const params = {};
      let matched = true;
      for (let i = 0; i < routeSegments.length; i += 1) {
        const rSeg = routeSegments[i];
        const pSeg = pathSegments[i];
        if (rSeg.startsWith(':')) {
          params[rSeg.slice(1)] = decodeURIComponent(pSeg);
        } else if (rSeg !== pSeg) {
          matched = false;
          break;
        }
      }
      if (matched) return { route, params };
    }
    return null;
  }

  async function render() {
    const path = currentPath();
    const match = matchRoute(path);
    const root = document.getElementById('view-root');

    if (!match) {
      root.innerHTML = '<div class="page"><div class="empty-state"><h1>Page not found</h1></div></div>';
      return;
    }

    const { route, params } = match;

    if (route.auth === 'guest' && State.isAuthenticated()) {
      window.location.hash = '#/search';
      return;
    }
    if (route.auth === 'user' && !State.isAuthenticated()) {
      window.location.hash = '#/login';
      return;
    }
    if (route.auth === 'admin' && !State.isAdmin()) {
      window.location.hash = State.isAuthenticated() ? '#/search' : '#/login';
      return;
    }

    root.setAttribute('aria-busy', 'true');
    try {
      await route.view(params);
    } catch (err) {
      console.error(err);
      root.innerHTML = `<div class="page"><div class="alert alert--error" data-testid="view-error">${Utils.escapeHtml(err.message)}</div></div>`;
    } finally {
      root.removeAttribute('aria-busy');
      document.getElementById('main-content').focus();
    }
    App.refreshNav();
  }

  function start() {
    window.addEventListener('hashchange', render);
    render();
  }

  return { start, render };
})();
