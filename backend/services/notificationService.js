const Notification = require('../models/Notification');

const createNotification = async ({ recipient, title, message, type = 'general', relatedRide = null }) => {
  try {
    if (!recipient) return null;
    const notification = await Notification.create({
      recipient,
      title,
      message,
      type,
      relatedRide
    });
    return notification;
  } catch (error) {
    console.error('[NotificationService Error] Failed to create notification:', error.message);
    return null;
  }
};

module.exports = { createNotification };
