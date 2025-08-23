const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// List my notifications (exclude archived)
router.get('/', auth, async (req, res) => {
  try {
    const list = await Notification.find({
      userId: req.user.id,
      archived: { $ne: true }
    }).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark one as read
router.post('/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    notif.read = true;
    await notif.save();
    res.json({ message: 'Notification marked as read' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Clear (soft-hide) only READ notifications for this user
router.delete('/clear-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: true, archived: { $ne: true } },
      { $set: { archived: true } }
    );
    res.json({ message: 'Read notifications cleared' });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;