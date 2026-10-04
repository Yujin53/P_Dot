/**
 * P_Dot Fares & Locations Service Module
 * Tuguegarao-Native Ride-Hailing Platform
 */
const FareService = {
  async getFareRules() {
    return API.get('/fare-rules');
  },

  async getLocations(type = '') {
    let url = '/locations';
    if (type) url += `?type=${encodeURIComponent(type)}`;
    return API.get(url);
  },

  async getServiceAreas() {
    return API.get('/service-areas');
  },

  async calculateEstimate(serviceType, distanceKm, durationMin) {
    return API.get(`/fares/estimate?serviceType=${serviceType}&distanceKm=${distanceKm}&durationMinutes=${durationMin}`);
  },

  formatPHP(amount) {
    return `₱${parseFloat(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
};
