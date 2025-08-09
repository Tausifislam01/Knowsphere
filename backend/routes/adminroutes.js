const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Log = require('../models/Log');
const { auth, adminAuth } = require('../middleware/auth');

router.get('/insights/reported', auth, adminAuth, async (req, res) => {
  try {
    const insightReports = await Report.find({ reportedItemType: 'Insight', status: 'pending' })
      .populate({
        path: 'reportedItemId',
        populate: { path: 'userId', select: 'username isBanned isAdmin' },
      });

    const reportedInsights = insightReports
      .filter(report => report.reportedItemId)
      .map(report => report.reportedItemId)
      .filter((insight, index, self) => 
        self.findIndex(i => i._id.toString() === insight._id.toString()) === index
      );

    res.json(reportedInsights);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/comments/reported', auth, adminAuth, async (req, res) => {
  try {
    const commentReports = await Report.find({ reportedItemType: 'Comment', status: 'pending' })
      .populate({
        path: 'reportedItemId',
        populate: { path: 'userId', select: 'username isBanned isAdmin' },
      });

    const reportedComments = commentReports
      .filter(report => report.reportedItemId)
      .map(report => report.reportedItemId)
      .filter((comment, index, self) => 
        self.findIndex(c => c._id.toString() === comment._id.toString()) === index
      );

    res.json(reportedComments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
    report.resolvedBy = req.user.id;
    report.resolvedAt = Date.now();
    await report.save();

    await Log.create({
      action: 'resolve_report',
      adminId: req.user.id,
      targetId: req.params.reportId,
      targetType: 'Report',
      details: `Report ${req.params.reportId} ${status} by admin`,
    });

    res.json({ message: `Report ${status}`, report });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/insights/:insightId/hide', auth, adminAuth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    insight.isHidden = !insight.isHidden;
    await insight.save();

    await Log.create({
      action: insight.isHidden ? 'hide_insight' : 'unhide_insight',
      adminId: req.user.id,
      targetId: req.params.insightId,
      targetType: 'Insight',
      details: `Insight ${req.params.insightId} ${insight.isHidden ? 'hidden' : 'unhidden'} by admin`,
    });

    res.json({ message: `Insight ${insight.isHidden ? 'hidden' : 'unhidden'}`, insight });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/insights/:insightId', auth, adminAuth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });
    await Comment.deleteMany({ insightId: req.params.insightId });
    await Report.deleteMany({ reportedItemType: 'Insight', reportedItemId: req.params.insightId });
    await Insight.deleteOne({ _id: req.params.insightId });

    await Log.create({
      action: 'delete_insight',
      adminId: req.user.id,
      targetId: req.params.insightId,
      targetType: 'Insight',
      details: `Insight ${req.params.insightId} deleted by admin`,
    });

    if (req.io) {
      req.io.emit('insightDeleted', { id: req.params.insightId });
    }
    res.json({ message: 'Insight and associated comments/reports deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/comments/:commentId/hide', auth, adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    comment.isHidden = !comment.isHidden;
    await comment.save();

    await Log.create({
      action: comment.isHidden ? 'hide_comment' : 'unhide_comment',
      adminId: req.user.id,
      targetId: req.params.commentId,
      targetType: 'Comment',
      details: `Comment ${req.params.commentId} ${comment.isHidden ? 'hidden' : 'unhidden'} by admin`,
    });

    if (req.io) {
      req.io.emit('commentUpdated', comment);
    }
    res.json({ message: `Comment ${comment.isHidden ? 'hidden' : 'unhidden'}`, comment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/comments/:commentId', auth, adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    await Report.deleteMany({ reportedItemType: 'Comment', reportedItemId: req.params.commentId });
    await Comment.deleteOne({ _id: req.params.commentId });

    await Log.create({
      action: 'delete_comment',
      adminId: req.user.id,
      targetId: req.params.commentId,
      targetType: 'Comment',
      details: `Comment ${req.params.commentId} deleted by admin`,
    });

    if (req.io) {
      req.io.emit('commentDeleted', { id: req.params.commentId });
    }
    res.json({ message: 'Comment and associated reports deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users/:userId/ban', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isAdmin) {
      return res.status(403).json({ message: 'Cannot ban an admin' });
    }
    user.isBanned = true;
    await user.save();

    await Log.create({
      action: 'ban_user',
      adminId: req.user.id,
      targetId: req.params.userId,
      targetType: 'User',
      details: `User ${req.params.userId} banned by admin`,
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
      targetId: req.params.userId,
      targetType: 'User',
      details: `User ${req.params.userId} unbanned by admin`,
    });

    res.json({ message: 'User unbanned', user });
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

router.get('/user-report-count/:userId', auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const insights = await Insight.find({ userId }).select('_id');
    const insightIds = insights.map(i => i._id);
    const insightReportCount = await Report.countDocuments({
      reportedItemType: 'Insight',
      reportedItemId: { $in: insightIds }
    });
    const comments = await Comment.find({ userId }).select('_id');
    const commentIds = comments.map(c => c._id);
    const commentReportCount = await Report.countDocuments({
      reportedItemType: 'Comment',
      reportedItemId: { $in: commentIds }
    });
    const totalCount = insightReportCount + commentReportCount;
    res.json({ count: totalCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;