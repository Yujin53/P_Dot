/**
 * P_Dot Ride Booking & Dispatch Lifecycle Module
 * Tuguegarao-Native Ride-Hailing Platform
 */
const RideService = {
  async estimateFare(pickup, destination, serviceType) {
    return API.post('/rides/estimate', {
      pickup,
      destination,
      serviceType
    });
  },

  async createRide(rideRequestData) {
    return API.post('/rides', rideRequestData);
  },

  async getRideById(id) {
    return API.get(`/rides/${id}`);
  },

  async acceptRide(id) {
    return API.put(`/rides/${id}/accept`, {});
  },

  async updateRideStatus(id, status, notes = '') {
    return API.put(`/rides/${id}/status`, {
      status,
      notes
    });
  },

  async cancelRide(id, reason) {
    return API.put(`/rides/${id}/cancel`, {
      reason
    });
  },

  async getRideSummary(id) {
    return API.get(`/rides/${id}/summary`);
  },

  formatStatus(status) {
    if (!status) return '';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  getStatusBadgeClass(status) {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'requested':
      case 'searching':
        return 'badge-warning';
      case 'accepted':
      case 'driver_arriving':
      case 'driver_arrived':
      case 'trip_started':
        return 'badge-primary';
      case 'cancelled_by_passenger':
      case 'cancelled_by_driver':
      case 'cancelled_by_admin':
      case 'no_driver_available':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }
};
