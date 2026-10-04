/**
 * P_Dot Passenger Services Module
 * Tuguegarao-Native Ride-Hailing Platform
 */
const PassengerService = {
  async getProfile() {
    return API.get('/users/profile');
  },

  async updateProfile(profileData) {
    return API.put('/users/profile', profileData);
  },

  async getSavedPlaces() {
    return API.get('/users/saved-places');
  },

  async addSavedPlace(placeData) {
    return API.post('/users/saved-places', placeData);
  },

  async updateSavedPlace(id, placeData) {
    return API.put(`/users/saved-places/${id}`, placeData);
  },

  async deleteSavedPlace(id) {
    return API.delete(`/users/saved-places/${id}`);
  },

  async getActiveRide() {
    const res = await API.get('/rides?limit=1&status=requested,searching,accepted,driver_arriving,driver_arrived,trip_started');
    if (res.success && res.data && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  },

  async getRideHistory(page = 1, limit = 10, status = '') {
    let url = `/rides?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    return API.get(url);
  }
};
