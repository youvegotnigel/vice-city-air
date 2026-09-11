const Utils = (() => {
  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function formatMoney(amount, currency) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
  }

  function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  }

  let toastTimer = null;
  function toast(message, type = 'info') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `toast toast--${type}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }
  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function statusBadge(status) {
    return `<span class="badge badge--${status}" data-testid="status-badge">${escapeHtml(status)}</span>`;
  }

  return { escapeHtml, formatDate, formatTime, formatMoney, formatDuration, toast, qs, qsa, statusBadge };
})();
