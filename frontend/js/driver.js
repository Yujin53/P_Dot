/**
 * P_Dot Driver Services Module
 * Tuguegarao-Native Ride-Hailing Platform
 */
const DriverService = {
  async getProfile() {
    return API.get('/drivers/profile');
  },

  async updateProfile(profileData) {
    return API.put('/drivers/profile', profileData);
  },

  async getVerificationStatus() {
    return API.get('/drivers/verification-status');
  },

  async setAvailability(isOnline, coordinates = null, barangay = null) {
    const payload = { isOnline };
    if (coordinates && coordinates.lat && coordinates.lng) {
      payload.latitude = coordinates.lat;
      payload.longitude = coordinates.lng;
    }
    if (barangay) {
      payload.barangay = barangay;
    }
    return API.put('/drivers/availability', payload);
  },

  async getAvailableRideRequests() {
    return API.get('/drivers/ride-requests');
  },

  async getEarnings(period = 'all') {
    return API.get(`/drivers/earnings?period=${period}`);
  },

  async getMyVehicles() {
    return API.get('/vehicles/my');
  },

  async addVehicle(vehicleData) {
    return API.post('/vehicles', vehicleData);
  },

  async updateVehicle(id, vehicleData) {
    return API.put(`/vehicles/${id}`, vehicleData);
  },

  async deleteVehicle(id) {
    return API.delete(`/vehicles/${id}`);
  },

  async uploadDocuments(formData) {
    return API.upload('/drivers/documents', formData);
  }
};
