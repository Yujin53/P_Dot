const AuditLog = require('../models/AuditLog');

const logAudit = async ({ actor, action, targetType, targetId, description, req }) => {
  try {
    let ipAddress = '127.0.0.1';
    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    }

    await AuditLog.create({
      actor: actor?._id || actor,
      action,
      targetType,
      targetId,
      description,
      ipAddress
    });
  } catch (error) {
    console.error('[AuditService Error] Failed to write audit log:', error.message);
  }
};

module.exports = { logAudit };
