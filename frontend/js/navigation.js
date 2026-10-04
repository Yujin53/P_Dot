/**
 * P_Dot Navigation & Sidebar helper for Dashboards
 */
const Nav = {
  renderHeader(title = 'Dashboard') {
    const headerTitle = document.getElementById('pageTitle');
    if (headerTitle) {
      headerTitle.textContent = title;
    }
    Auth.setupUserBadge();
    Notifs.startPolling(10000);
  },

  setupLogoutButtons() {
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to log out of P_Dot?')) {
          Auth.logout();
        }
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Nav.setupLogoutButtons();
});
