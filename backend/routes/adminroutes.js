// backend/routes/adminroutes.js
const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Log = require('../models/Log');
const Notification = require('../models/Notification'); // ✅ NEW
const { auth, adminAuth } = require('../middleware/auth');

/** ---------------------- helpers ---------------------- */
const notify = async (userId, type, message, link = '') => {
  try {
    if (!userId) return;
    await Notification.create({ userId, type, message, link });
  } catch (e) {
    // Do not block admin actions because of notification failures
    console.error('Notification error:', e.message);
  }
};

const formatDate = (d) => {
  try {
    return new Date(d).toISOString();
  } catch {
    return new Date().toISOString();
  }
};

/** ---------------------- Pending queues ---------------------- */
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

/** ---------------------- Users list (for Admin UI) ---------------------- */
// Matches your frontend api.js `fetchUsers()` usage
router.get('/users', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('username email isAdmin isBanned bannedUntil violations profilePicture createdAt');
  res.json(users);
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});

/** ---------------------- Logs / handled reports ---------------------- */
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

/** ---------------------- User enforcement ---------------------- */
/**
 * POST /users/:userId/ban
 * Body: { durationDays?: number, reason?: string, incrementStrike?: boolean }
 *  - durationDays: omit or 0 => permanent, >0 => temp ban until now + days
 *  - incrementStrike defaults to true
 */
router.post('/users/:userId/ban', auth, adminAuth, async (req, res) => {
  try {
    const { durationDays = 0, reason = '', incrementStrike = true } = req.body || {};
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isAdmin) return res.status(403).json({ message: 'Cannot ban an admin' });

    // compute bannedUntil
    let bannedUntil = null;
    if (Number(durationDays) > 0) {
      const until = new Date();
      until.setDate(until.getDate() + Number(durationDays));
      bannedUntil = until;
    }

    user.isBanned = true;
    user.bannedUntil = bannedUntil;
    if (incrementStrike) {
      user.violations = (user.violations || 0) + 1;
    }
    await user.save();

    await Log.create({
      action: bannedUntil ? 'ban_user_temp' : 'ban_user_permanent',
      adminId: req.user.id,
      targetId: user._id,
      targetType: 'User',
      details: `User ${user.username} banned by admin ${req.user.id} ${bannedUntil ? `until ${formatDate(bannedUntil)}` : '(permanent)'} ${reason ? `- reason: ${reason}` : ''}`,
    });

    // notify the banned user
    await notify(
      user._id,
      'user_banned',
      bannedUntil
        ? `You have been temporarily banned until ${bannedUntil.toLocaleString()}. ${reason ? `Reason: ${reason}` : ''}`
        : `You have been permanently banned. ${reason ? `Reason: ${reason}` : ''}`
    );

    res.json({ message: 'User banned', user });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users/:userId/unban', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = false;
    user.bannedUntil = null;
    await user.save();

    await Log.create({
      action: 'unban_user',
      adminId: req.user.id,
      targetId: user._id,
      targetType: 'User',
      details: `User ${user.username} unbanned by admin ${req.user.id}`,
    });

    await notify(user._id, 'user_unbanned', 'Your account ban has been lifted.');

    res.json({ message: 'User unbanned', user });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/** ---------------------- Resolve/Dismiss a report ---------------------- */
/**
 * POST /reports/:reportId/resolve
 * Body: { status: 'resolved' | 'dismissed', resolutionNote?: string }
 */
router.post('/reports/:reportId/resolve', auth, adminAuth, async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = status;
    report.resolvedBy = req.user.id;
    report.resolvedAt = new Date();
    if (typeof resolutionNote === 'string' && resolutionNote.trim().length > 0) {
      report.resolutionNote = resolutionNote.trim();
    }
    await report.save();

    await Log.create({
      action: `resolve_report_${status}`,
      adminId: req.user.id,
      targetId: report._id,
      targetType: 'Report',
      details: `Report ${report._id} ${status} by admin ${req.user.id}${report.resolutionNote ? ` - note: ${report.resolutionNote}` : ''}`,
    });

    // notify the reporter that their report was handled
    await notify(
      report.reporterId,
      status === 'resolved' ? 'report_resolved' : 'report_dismissed',
      status === 'resolved'
        ? `Your report (${report._id}) was resolved.${report.resolutionNote ? ` Note: ${report.resolutionNote}` : ''}`
        : `Your report (${report._id}) was dismissed.${report.resolutionNote ? ` Note: ${report.resolutionNote}` : ''}`
    );

    res.json({ message: `Report ${status}`, report });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/** ---------------------- Content actions (with auto-resolve of pending reports) ---------------------- */
router.put('/insights/:insightId/hide', auth, adminAuth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId).populate('userId', 'username');
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

    // notify the author
    await notify(
      insight.userId?._id,
      'content_hidden',
      insight.isHidden
        ? `Your insight "${insight.title}" was hidden by admin.`
        : `Your insight "${insight.title}" was unhidden by admin.`,
      `/insights/${insight._id}`
    );

    res.json(insight);
  } catch (error) {
    console.error('Hide insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/insights/:insightId', auth, adminAuth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId).populate('userId', 'username');
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    await Insight.deleteOne({ _id: req.params.insightId });
    await Comment.deleteMany({ insightId: req.params.insightId });

    // Auto-resolve any pending reports referencing this insight
    await Report.updateMany(
      { reportedItemType: 'Insight', reportedItemId: req.params.insightId, status: 'pending' },
      { $set: { status: 'resolved', resolvedBy: req.user.id, resolvedAt: new Date(), resolutionNote: 'Content deleted by admin' } }
    );

    await Log.create({
      action: 'delete_insight',
      adminId: req.user.id,
      targetId: insight._id,
      targetType: 'Insight',
      details: `Insight ${insight._id} deleted by admin ${req.user.id}`,
    });

    // notify the author
    await notify(
      insight.userId?._id,
      'content_deleted',
      `Your insight "${insight.title}" was deleted by admin.`
    );

    res.json({ message: 'Insight deleted' });
  } catch (error) {
    console.error('Delete insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/comments/:commentId/hide', auth, adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate('userId', 'username');
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

    await notify(
      comment.userId?._id,
      'content_hidden',
      comment.isHidden
        ? 'One of your comments was hidden by admin.'
        : 'One of your comments was unhidden by admin.'
    );

    res.json(comment);
  } catch (error) {
    console.error('Hide comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/comments/:commentId', auth, adminAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId).populate('userId', 'username');
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    await Comment.deleteOne({ _id: req.params.commentId });
    await Insight.findByIdAndUpdate(comment.insightId, { $inc: { commentCount: -1 } });

    // also delete replies
    await Comment.deleteMany({ parentCommentId: req.params.commentId });

    // Auto-resolve any pending reports referencing this comment
    await Report.updateMany(
      { reportedItemType: 'Comment', reportedItemId: req.params.commentId, status: 'pending' },
      { $set: { status: 'resolved', resolvedBy: req.user.id, resolvedAt: new Date(), resolutionNote: 'Content deleted by admin' } }
    );

    await Log.create({
      action: 'delete_comment',
      adminId: req.user.id,
      targetId: comment._id,
      targetType: 'Comment',
      details: `Comment ${comment._id} deleted by admin ${req.user.id}`,
    });

    await notify(
      comment.userId?._id,
      'content_deleted',
      'One of your comments was deleted by admin.'
    );

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/** ---------------------- Metrics ---------------------- */
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
