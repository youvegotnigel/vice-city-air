/**
 * Simple client-side auth state.
 *
 * NOTE: the JWT is stored in localStorage for simplicity. This is a common
 * but imperfect pattern in real apps: any script running on the page (e.g.
 * an injected XSS payload, see REQUIREMENTS.md item B3) can read it. A
 * hardened implementation would use an httpOnly cookie instead. Documented
 * here deliberately as part of the app's security posture for testing.
 */
const State = (() => {
  const TOKEN_KEY = 'sky_demo_token';
  const USER_KEY = 'sky_demo_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function isAuthenticated() {
    return Boolean(getToken());
  }
  function isAdmin() {
    const user = getUser();
    return Boolean(user && user.role === 'admin');
  }

  return { getToken, getUser, setSession, clearSession, isAuthenticated, isAdmin };
})();
