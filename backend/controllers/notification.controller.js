// backend/controllers/notification.controller.js
const Notification = require('../models/Notification');

exports.listMine = async (req, res) => {
  try {
    const list = await Notification.find({
      userId: req.user.id,
      archived: { $ne: true },
    }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    notif.read = true;
    await notif.save();
    return res.json({ message: 'Notification marked as read' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.clearRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: true, archived: { $ne: true } },
      { $set: { archived: true } }
    );
    return res.json({ message: 'Read notifications cleared' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};
