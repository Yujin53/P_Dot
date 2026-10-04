/**
 * P_Dot Ratings & Reviews Module
 * Tuguegarao-Native Ride-Hailing Platform
 */
const RatingService = {
  async submitRating(rideId, driverId, rating, comment = '') {
    return API.post('/ratings', {
      rideId,
      driverId,
      rating: Number(rating),
      comment
    });
  },

  async getMyRatings() {
    return API.get('/ratings/my');
  },

  async getDriverRatings(driverId) {
    return API.get(`/ratings/driver/${driverId}`);
  },

  renderStars(rating) {
    const full = Math.floor(rating || 0);
    let stars = '';
    for (let i = 0; i < 5; i++) {
      if (i < full) {
        stars += '★';
      } else {
        stars += '☆';
      }
    }
    return stars;
  }
};
