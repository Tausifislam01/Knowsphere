// backend/routes/adminroutes.js
const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Log = require('../models/Log');
const { auth, adminAuth } = require('../middleware/auth');

// -------- Pending queues --------
router.get('/insights/reported', auth, adminAuth, async (req, res) => {
  try {
    const insightReports = await Report.find({ reportedItemType: 'Insight', status: 'pending' })
      .populate({
        path: 'reportedItemId',
        populate: { path: 'userId', select: 'username isBanned isAdmin profilePicture' },
      })
      .populate('reporterId', 'username');

    // Keep all reports; UI can fallback to snapshot if reportedItemId is missing
    res.json(insightReports);
  } catch (error) {
    console.error('Fetch reported insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/comments/reported', auth, adminAuth, async (req, res) => {
  try {
    const commentReports = await Report.find({ reportedItemType: 'Comment', status: 'pending' })
      .populate({
        path: 'reportedItemId',
        populate: [
          { path: 'userId', select: 'username isBanned isAdmin profilePicture' },
          { path: 'insightId', select: 'title' },
        ],
      })
      .populate('reporterId', 'username');

    res.json(commentReports);
  } catch (error) {
    console.error('Fetch reported comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- Logs / handled reports --------
router.get('/logs', auth, adminAuth, async (req, res) => {
  try {
    const { action, adminId, startDate, endDate } = req.query;
    const query = {};
    if (action) query.action = action;
    if (adminId) query.adminId = adminId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const logs = await Log.find(query)
      .populate('adminId', 'username')
      .populate('targetId', 'title text username')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/handled-reports', auth, adminAuth, async (req, res) => {
  try {
    const { status, resolvedBy, startDate, endDate, itemType } = req.query;
    const query = { status: { $in: ['resolved', 'dismissed'] } };
    if (status) query.status = status;
    if (resolvedBy) query.resolvedBy = resolvedBy;
    if (itemType && ['Insight', 'Comment'].includes(itemType)) query.reportedItemType = itemType;
    if (startDate || endDate) {
      query.resolvedAt = {};
      if (startDate) query.resolvedAt.$gte = new Date(startDate);
      if (endDate) query.resolvedAt.$lte = new Date(endDate);
    }

    const reports = await Report.find(query)
      .populate('reporterId', 'username')
      .populate({
        path: 'reportedItemId',
        populate: { path: 'userId', select: 'username isBanned isAdmin' },
      })
      .populate('resolvedBy', 'username')
      .sort({ resolvedAt: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- User enforcement --------
router.post('/users/:userId/ban', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isAdmin) return res.status(403).json({ message: 'Cannot ban an admin' });

    user.isBanned = true;
    await user.save();

    await Log.create({
      action: 'ban_user',
      adminId: req.user.id,
      targetId: user._id,
      targetType: 'User',
      details: `User ${user.username} banned by admin ${req.user.id}`,
    });

    res.json({ message: 'User banned', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users/:userId/unban', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = false;
    await user.save();

    await Log.create({
      action: 'unban_user',
      adminId: req.user.id,
      targetId: user._id,
      targetType: 'User',
      details: `User ${user.username} unbanned by admin ${req.user.id}`,
    });

    res.json({ message: 'User unbanned', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- Resolve/Dismiss a report --------
router.post('/reports/:reportId/resolve', auth, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = status;
    report.resolvedBy = req.user.id;
    report.resolvedAt = new Date();
    await report.save();

    await Log.create({
      action: `resolve_report_${status}`,
      adminId: req.user.id,
      targetId: report._id,
      targetType: 'Report',
      details: `Report ${report._id} ${status} by admin ${req.user.id}`,
    });

    res.json({ message: `Report ${status}`, report });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- Content actions (with auto-resolve of pending reports) --------
router.put('/insights/:insightId/hide', auth, adminAuth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    insight.isHidden = !insight.isHidden;
    await insight.save();

    await Log.create({
      action: insight.isHidden ? 'hide_insight' : 'unhide_insight',
      adminId: req.user.id,
      targetId: insight._id,
      targetType: 'Insight',
      details: `Insight ${insight._id} ${insight.isHidden ? 'hidden' : 'unhidden'} by admin ${req.user.id}`,
    });

    res.json(insight);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/insights/:insightId', auth, adminAuth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    await Insight.deleteOne({ _id: req.params.insightId });
    await Comment.deleteMany({ insightId: req.params.insightId });

    // Auto-resolve any pending reports referencing this insight
    await Report.updateMany(
      { reportedItemType: 'Insight', reportedItemId: req.params.insightId, status: 'pending' },
      { $set: { status: 'resolved', resolvedBy: req.user.id, resolvedAt: new Date() } }
    );

    await Log.create({
      action: 'delete_insight',
      adminId: req.user.id,
      targetId: insight._id,
      targetType: 'Insight',
      details: `Insight ${insight._id} deleted by admin ${req.user.id}`,
    });

    res.json({ message: 'Insight deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/comments/:commentId/hide', auth, adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.isHidden = !comment.isHidden;
    await comment.save();

    await Log.create({
      action: comment.isHidden ? 'hide_comment' : 'unhide_comment',
      adminId: req.user.id,
      targetId: comment._id,
      targetType: 'Comment',
      details: `Comment ${comment._id} ${comment.isHidden ? 'hidden' : 'unhidden'} by admin ${req.user.id}`,
    });

    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/comments/:commentId', auth, adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    await Comment.deleteOne({ _id: req.params.commentId });
    await Insight.findByIdAndUpdate(comment.insightId, { $inc: { commentCount: -1 } });

    // also delete replies
    await Comment.deleteMany({ parentCommentId: req.params.commentId });

    // Auto-resolve any pending reports referencing this comment
    await Report.updateMany(
      { reportedItemType: 'Comment', reportedItemId: req.params.commentId, status: 'pending' },
      { $set: { status: 'resolved', resolvedBy: req.user.id, resolvedAt: new Date() } }
    );

    await Log.create({
      action: 'delete_comment',
      adminId: req.user.id,
      targetId: comment._id,
      targetType: 'Comment',
      details: `Comment ${comment._id} deleted by admin ${req.user.id}`,
    });

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// -------- Metrics --------
router.get('/user-report-count/:userId', auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const insights = await Insight.find({ userId }).select('_id');
    const insightIds = insights.map((i) => i._id);

    const insightReportCount = await Report.countDocuments({
      reportedItemType: 'Insight',
      reportedItemId: { $in: insightIds },
    });

    const comments = await Comment.find({ userId }).select('_id');
    const commentIds = comments.map((c) => c._id);

    const commentReportCount = await Report.countDocuments({
      reportedItemType: 'Comment',
      reportedItemId: { $in: commentIds },
    });

    const totalCount = insightReportCount + commentReportCount;
    res.json({ count: totalCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
