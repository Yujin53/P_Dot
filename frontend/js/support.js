/**
 * P_Dot Support & Helpdesk Module
 * Tuguegarao-Native Ride-Hailing Platform
 */
const SupportService = {
  async createTicket(ticketData) {
    if (ticketData instanceof FormData) {
      return API.upload('/support/tickets', ticketData);
    }
    return API.post('/support/tickets', ticketData);
  },

  async getMyTickets() {
    return API.get('/support/tickets');
  },

  async getTicketById(id) {
    return API.get(`/support/tickets/${id}`);
  },

  async updateTicket(id, updateData) {
    return API.put(`/support/tickets/${id}`, updateData);
  }
};
