/**
 * P_Dot Client-side Notification Poller & Panel
 */
const Notifs = {
  unreadCount: 0,

  async fetchNotifications() {
    try {
      const res = await API.get('/notifications');
      if (res.success) {
        this.unreadCount = res.unreadCount || 0;
        this.renderBadge();
        return res.data;
      }
    } catch (e) {
      console.warn('Could not poll notifications:', e.message);
    }
    return [];
  },

  renderBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;

    if (this.unreadCount > 0) {
      badge.textContent = this.unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  async markAllRead() {
    try {
      await API.put('/notifications/read-all', {});
      this.unreadCount = 0;
      this.renderBadge();
    } catch (e) {
      console.error(e);
    }
  },

  startPolling(intervalMs = 8000) {
    this.fetchNotifications();
    setInterval(() => {
      this.fetchNotifications();
    }, intervalMs);
  }
};
