const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getAllUsers,
  updateUserStatus,
  getAllDrivers,
  approveDriver,
  rejectDriver,
  toggleSuspendDriver,
  getAllVehicles,
  adminCancelRide,
  reassignRide,
  createFareRule,
  updateFareRule,
  deleteFareRule,
  createLocation,
  updateLocation,
  deleteLocation,
  getAdminReports,
  getAuditLogs,
  broadcastAnnouncement
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');

// All admin routes require login and admin/superadmin role
router.use(protect);
router.use(adminOnly);

// Metrics & Dashboards
router.get('/dashboard', getAdminDashboard);
router.get('/reports', getAdminReports);
router.get('/audit-logs', getAuditLogs);
router.post('/broadcast', broadcastAnnouncement);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);

// Driver Management & Verification
router.get('/drivers', getAllDrivers);
router.put('/drivers/:id/approve', approveDriver);
router.put('/drivers/:id/reject', rejectDriver);
router.put('/drivers/:id/suspend', toggleSuspendDriver);

// Vehicle Management
router.get('/vehicles', getAllVehicles);

// Operational Ride Dispatch Overrides
router.put('/rides/:id/cancel', adminCancelRide);
router.put('/rides/:id/reassign', reassignRide);

// Fare Rules Management
router.post('/fare-rules', createFareRule);
router.put('/fare-rules/:id', updateFareRule);
router.delete('/fare-rules/:id', deleteFareRule);

// Locations & Service Areas Management
router.post('/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);

router.post('/service-areas', createLocation);
router.put('/service-areas/:id', updateLocation);
router.delete('/service-areas/:id', deleteLocation);

module.exports = router;
