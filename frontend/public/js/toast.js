// ══════════════════════════════════════════
// Reusable Toast Notification System
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Inject container if it doesn't exist
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
});

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Time in ms before auto-dismiss (default: 3000)
 */
window.showToast = (message, type = 'info', duration = 3000) => {
  const container = document.getElementById('toast-container');
  if (!container) return; // Failsafe if called too early

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-content">${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Remove logic
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
    }, 400); // Wait for transition
  }, duration);
};
