const App = (() => {
  function refreshNav() {
    const user = State.getUser();
    const role = user ? user.role : 'guest';

    Utils.qsa('[data-auth]').forEach((el) => {
      const allowed = el.getAttribute('data-auth').split(',');
      el.hidden = !allowed.includes(role);
    });

    const chip = document.getElementById('user-chip');
    if (user) {
      chip.hidden = false;
      chip.textContent = `${user.name} (${user.role})`;
    } else {
      chip.hidden = true;
    }
  }

  function logout() {
    State.clearSession();
    Utils.toast('Logged out', 'success');
    window.location.hash = '#/login';
    refreshNav();
  }

  function loadVersion() {
    const el = document.getElementById('app-version');
    if (!el) return;
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.version) el.textContent = `v${data.version}`;
      })
      .catch(() => {});
  }

  function init() {
    document.getElementById('logout-btn').addEventListener('click', logout);
    refreshNav();
    loadVersion();
    Router.start();
  }

  return { refreshNav, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
