const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

// GET /api/admin/reports - View all pending reports
router.get('/reports', auth, adminAuth, async (req, res) => {
  try {
    const reports = await Report.find({ status: 'pending' })
      .populate('reporterId', 'username')
      .populate({
        path: 'reportedItemId',
        populate: { path: 'userId', select: 'username' },
      });
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/users - Fetch all users
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('username email isBanned isAdmin')
      .lean();
    console.log('Fetched users:', users);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/reports/:reportId/resolve - Resolve or dismiss a report
router.post('/reports/:reportId/resolve', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const report = await Report.findById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    report.status = status;
    await report.save();
    res.json({ message: `Report ${status}`, report });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/insights/:insightId/hide - Hide or unhide an insight
router.put('/insights/:insightId/hide', auth, adminAuth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    insight.isHidden = !insight.isHidden;
    await insight.save();
    if (req.io) {
      req.io.emit('insightUpdated', insight);
    }
    res.json({ message: `Insight ${insight.isHidden ? 'hidden' : 'unhidden'}`, insight });
  } catch (error) {
    console.error('Hide/unhide insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/insights/:insightId - Delete an insight
router.delete('/insights/:insightId', auth, adminAuth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });
    await Comment.deleteMany({ insightId: req.params.insightId });
    await Report.deleteMany({ reportedItemType: 'Insight', reportedItemId: req.params.insightId });
    await Insight.deleteOne({ _id: req.params.insightId });
    if (req.io) {
      req.io.emit('insightDeleted', { id: req.params.insightId });
    }
    res.json({ message: 'Insight and associated comments/reports deleted' });
  } catch (error) {
    console.error('Delete insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/comments/:commentId/hide - Hide or unhide a comment
router.post('/comments/:commentId/hide', auth, adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    comment.isHidden = !comment.isHidden;
    await comment.save();
    if (req.io) {
      req.io.emit('commentUpdated', comment);
    }
    res.json({ message: `Comment ${comment.isHidden ? 'hidden' : 'unhidden'}`, comment });
  } catch (error) {
    console.error('Hide comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/comments/:commentId - Delete a comment
router.delete('/comments/:commentId', auth, adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    await Report.deleteMany({ reportedItemType: 'Comment', reportedItemId: req.params.commentId });
    await Comment.deleteOne({ _id: req.params.commentId });
    if (req.io) {
      req.io.emit('commentDeleted', { id: req.params.commentId });
    }
    res.json({ message: 'Comment and associated reports deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/users/:userId/ban - Ban a user
router.post('/users/:userId/ban', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isAdmin) {
      return res.status(403).json({ message: 'Cannot ban an admin' });
    }
    user.isBanned = true;
    await user.save();
    res.json({ message: 'User banned', user });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/users/:userId/unban - Unban a user
router.post('/users/:userId/unban', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isBanned = false;
    await user.save();
    res.json({ message: 'User unbanned', user });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;