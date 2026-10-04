/**
 * P_Dot Administrator Module
 * Tuguegarao-Native Ride-Hailing Platform
 */
const AdminService = {
  async getDashboard() {
    return API.get('/admin/dashboard');
  },

  async getUsers(page = 1, limit = 20, role = '', status = '', search = '') {
    let url = `/admin/users?page=${page}&limit=${limit}`;
    if (role) url += `&role=${encodeURIComponent(role)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return API.get(url);
  },

  async updateUserStatus(id, accountStatus) {
    return API.put(`/admin/users/${id}/status`, { accountStatus });
  },

  async getDrivers(page = 1, limit = 20, status = '') {
    let url = `/admin/drivers?page=${page}&limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return API.get(url);
  },

  async approveDriver(id) {
    return API.put(`/admin/drivers/${id}/approve`, {});
  },

  async rejectDriver(id, reason) {
    return API.put(`/admin/drivers/${id}/reject`, { reason });
  },

  async suspendDriver(id) {
    return API.put(`/admin/drivers/${id}/suspend`, {});
  },

  async getVehicles(page = 1, limit = 20) {
    return API.get(`/admin/vehicles?page=${page}&limit=${limit}`);
  },

  async getRides(page = 1, limit = 20, status = '', search = '') {
    let url = `/admin/rides?page=${page}&limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return API.get(url);
  },

  async reassignRide(id, driverId) {
    return API.put(`/admin/rides/${id}/reassign`, { driverId });
  },

  async cancelRide(id, reason) {
    return API.put(`/admin/rides/${id}/cancel`, { reason });
  },

  async getReports(range = '7days') {
    return API.get(`/admin/reports?range=${encodeURIComponent(range)}`);
  },

  async getAuditLogs(page = 1, limit = 25) {
    return API.get(`/admin/audit-logs?page=${page}&limit=${limit}`);
  },

  async saveFareRule(ruleData, id = null) {
    if (id) {
      return API.put(`/admin/fare-rules/${id}`, ruleData);
    }
    return API.post('/admin/fare-rules', ruleData);
  },

  async deleteFareRule(id) {
    return API.delete(`/admin/fare-rules/${id}`);
  },

  async saveLocation(locationData, id = null) {
    if (id) {
      return API.put(`/admin/locations/${id}`, locationData);
    }
    return API.post('/admin/locations', locationData);
  },

  async deleteLocation(id) {
    return API.delete(`/admin/locations/${id}`);
  },

  async getSupportTickets(page = 1, limit = 20, status = '') {
    let url = `/admin/support-tickets?page=${page}&limit=${limit}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return API.get(url);
  }
};
