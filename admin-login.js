(function () {
  const store = window.SpoonbillStore;
  if (!store) return;

  const { isAdminAuthenticated, setAdminSession, loadAuth } = store;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (isAdminAuthenticated()) {
      window.location.href = 'boh.html';
      return;
    }

    const form = document.getElementById('admin-login-form');
    const message = document.getElementById('login-message');
    if (!form || !message) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const passwordInput = document.getElementById('admin-password');
      const supplied = passwordInput ? passwordInput.value : '';
      const auth = loadAuth();

      if (supplied === auth.password) {
        setAdminSession(true);
        message.textContent = 'Access granted. Opening BOH...';
        message.className = 'login-message success';
        window.setTimeout(() => {
          window.location.href = 'boh.html';
        }, 300);
      } else {
        message.textContent = 'Invalid password. Please try again.';
        message.className = 'login-message error';
      }
    });
  }
})();
