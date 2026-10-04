const { authorize } = require('./roleMiddleware');

const adminOnly = authorize('admin', 'superadmin');
const superAdminOnly = authorize('superadmin');

module.exports = { adminOnly, superAdminOnly };
