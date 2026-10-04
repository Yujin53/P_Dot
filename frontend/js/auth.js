/**
 * P_Dot Client-side Authentication & Session Guard
 */
const Auth = {
  checkAuth(allowedRoles = []) {
    const token = API.getToken();
    const user = API.getUser();

    if (!token || !user) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      alert(`Access Denied: Your account role (${user.role}) is not authorized for this section.`);
      this.redirectDashboard(user.role);
      return false;
    }

    return true;
  },

  redirectDashboard(role) {
    if (role === 'admin' || role === 'superadmin') {
      window.location.href = '/admin/dashboard.html';
    } else if (role === 'driver') {
      window.location.href = '/driver/dashboard.html';
    } else {
      window.location.href = '/passenger/dashboard.html';
    }
  },

  async logout() {
    try {
      await API.post('/auth/logout', {});
    } catch (e) {
      // Ignore network failures on logout
    }
    API.clearAuth();
    window.location.href = '/login.html?logged_out=1';
  },

  setupUserBadge() {
    const user = API.getUser();
    if (!user) return;

    const nameElements = document.querySelectorAll('.user-name-display');
    nameElements.forEach(el => {
      el.textContent = `${user.firstName} ${user.lastName}`;
    });

    const roleElements = document.querySelectorAll('.user-role-display');
    roleElements.forEach(el => {
      el.textContent = user.role.toUpperCase();
    });

    const avatarElements = document.querySelectorAll('.user-avatar-display');
    const fallbackSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='%230F766E'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6'/></svg>";
    avatarElements.forEach(el => {
      el.onerror = () => {
        el.onerror = null;
        el.src = fallbackSvg;
      };
      if (user.profileImage) {
        el.src = user.profileImage;
      } else {
        el.src = fallbackSvg;
      }
    });
  }
};
