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

  function init() {
    document.getElementById('logout-btn').addEventListener('click', logout);
    refreshNav();
    Router.start();
  }

  return { refreshNav, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
