// backend/controllers/admin.controller.js
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Log = require('../models/Log');

/* ======================= helpers ======================= */

function ensureObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

function parseDateRange(startDateStr, endDateStr) {
  const range = {};
  if (startDateStr) range.$gte = new Date(`${startDateStr}T00:00:00.000Z`);
  if (endDateStr) range.$lte = new Date(`${endDateStr}T23:59:59.999Z`);
  return Object.keys(range).length ? range : undefined;
}

// details must be a STRING in Log schema → stringify safely
function stringifyDetails(obj) {
  if (typeof obj === 'string') return obj;
  try { return JSON.stringify(obj ?? {}); } catch { return String(obj ?? ''); }
}

async function writeLog({ adminId, action, details }) {
  try {
    await Log.create({
      adminId: adminId?.toString?.() || String(adminId || ''),
      action: action || '',
      details: stringifyDetails(details), // <-- always a string
    });
  } catch (e) {
    console.error('writeLog error:', e);
  }
}

/* ======================= Reports ======================= */

// GET /api/admin/reports/pending
exports.getPendingReports = async (_req, res) => {
  try {
    const reports = await Report.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('reporterId', 'username')
      .populate('resolvedBy', 'username')
      .populate({
        path: 'reportedItemId',
        populate: { path: 'userId', select: 'username isAdmin isBanned' },
      })
      .lean();

    return res.json(reports);
  } catch (err) {
    console.error('getPendingReports error:', err);
    return res.status(500).json({ message: 'Failed to load pending reports' });
  }
};

// GET /api/admin/reports/handled   (routes may also alias to /api/admin/handled-reports)
exports.getHandledReports = async (req, res) => {
  try {
    const { status, resolvedBy, startDate, endDate, itemType } = req.query;

    const filter = { status: { $in: ['resolved', 'dismissed'] } };
    if (status && ['resolved', 'dismissed'].includes(status)) filter.status = status;
    if (itemType && ['Insight', 'Comment'].includes(itemType)) filter.reportedItemType = itemType;
    if (resolvedBy && ensureObjectId(resolvedBy)) filter.resolvedBy = resolvedBy;

    const range = parseDateRange(startDate, endDate);
    if (range) {
      filter.$or = [
        { resolvedAt: range },
        { $and: [{ resolvedAt: { $exists: false } }, { createdAt: range }] },
      ];
    }

    const handled = await Report.find(filter)
      .sort({ resolvedAt: -1, createdAt: -1 })
      .populate('reporterId', 'username')
      .populate('resolvedBy', 'username')
      .populate({
        path: 'reportedItemId',
        populate: { path: 'userId', select: 'username isAdmin isBanned' },
      })
      .lean();

    return res.json(handled);
  } catch (err) {
    console.error('getHandledReports error:', err);
    return res.status(500).json({ message: 'Failed to load handled reports' });
  }
};

// POST /api/admin/reports/:id/resolve
// Accepts either { status: 'resolved'|'dismissed', note? }  OR  { dismiss: boolean, note? }
exports.resolveReportWithNote = async (req, res) => {
  try {
    const { id } = req.params;
    let { status, note, dismiss } = req.body || {};

    // back-compat mapping
    if (!status && typeof dismiss === 'boolean') {
      status = dismiss ? 'dismissed' : 'resolved';
    }
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const adminId = req.user?.id || req.user?._id?.toString();
    if (!adminId) return res.status(401).json({ message: 'Missing admin identity' });

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = status;
    report.resolutionNote = (note || '').trim();
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();
    await report.save();

    await writeLog({
      adminId,
      action: `report:${status}`, // e.g., report:resolved | report:dismissed
      details: { reportId: report._id.toString(), note: report.resolutionNote || '' },
    });

    return res.json({ message: 'Report updated', report });
  } catch (err) {
    console.error('resolveReportWithNote error:', err);
    return res.status(500).json({ message: 'Failed to update report' });
  }
};

/* ======================= Users ======================= */

// GET /api/admin/users
exports.listAllUsers = async (_req, res) => {
  try {
    const users = await User.find({}, 'username email isAdmin isBanned bannedUntil violations')
      .sort({ createdAt: -1 })
      .lean();
    return res.json(users);
  } catch (err) {
    console.error('listAllUsers error:', err);
    return res.status(500).json({ message: 'Failed to load users' });
  }
};

// GET /api/admin/user-report-count/:userId
exports.getUserReportCount = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ensureObjectId(userId)) return res.json({ count: 0 });

    const [insightIds, commentIds] = await Promise.all([
      Insight.find({ userId }, { _id: 1 }).lean(),
      Comment.find({ userId }, { _id: 1 }).lean(),
    ]);

    const count = await Report.countDocuments({
      $or: [
        { reportedItemType: 'Insight', reportedItemId: { $in: insightIds.map(x => x._id) } },
        { reportedItemType: 'Comment', reportedItemId: { $in: commentIds.map(x => x._id) } },
      ],
    });

    return res.json({ count });
  } catch (err) {
    console.error('getUserReportCount error:', err);
    return res.status(500).json({ message: 'Failed to load report count' });
  }
};

// POST /api/admin/users/:id/ban
// Body: { until?: ISO string | null, reason?: string, incrementStrike?: boolean }
exports.banUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id?.toString();
    const { until = null, reason = '', incrementStrike = false } = req.body || {};

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = true;
    user.bannedUntil = until ? new Date(until) : null;
    if (incrementStrike) user.violations = Math.max(0, (user.violations || 0) + 1);
    await user.save();

    await writeLog({
      adminId,
      action: 'user:ban',
      details: { userId: user._id.toString(), until: user.bannedUntil, reason, incrementStrike: !!incrementStrike },
    });

    return res.json({ message: 'User banned', userId: user._id, bannedUntil: user.bannedUntil });
  } catch (err) {
    console.error('banUser error:', err);
    return res.status(500).json({ message: 'Failed to ban user' });
  }
};

// POST /api/admin/users/:id/unban
exports.unbanUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id?.toString();

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = false;
    user.bannedUntil = null;
    await user.save();

    await writeLog({
      adminId,
      action: 'user:unban',
      details: { userId: user._id.toString() },
    });

    return res.json({ message: 'User unbanned', userId: user._id });
  } catch (err) {
    console.error('unbanUser error:', err);
    return res.status(500).json({ message: 'Failed to unban user' });
  }
};

/* ======================= Insights moderation ======================= */

// PUT /api/admin/insights/:id/hide   (toggle)
exports.hideInsight = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id?.toString();

    const insight = await Insight.findById(id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    insight.isHidden = !insight.isHidden;
    await insight.save();

    await writeLog({
      adminId,
      action: `insight:${insight.isHidden ? 'hide' : 'unhide'}`,
      details: { insightId: insight._id.toString() },
    });

    return res.json({ message: 'Insight visibility updated', insight });
  } catch (err) {
    console.error('hideInsight error:', err);
    return res.status(500).json({ message: 'Failed to update insight' });
  }
};

// DELETE /api/admin/insights/:id
exports.deleteInsight = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id?.toString();

    const insight = await Insight.findById(id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    await insight.deleteOne();

    await writeLog({
      adminId,
      action: 'insight:delete',
      details: { insightId: id.toString() },
    });

    return res.json({ message: 'Insight deleted' });
  } catch (err) {
    console.error('deleteInsight error:', err);
    return res.status(500).json({ message: 'Failed to delete insight' });
  }
};

/* ======================= Comments moderation ======================= */

// PUT /api/admin/comments/:id/hide   (toggle)
exports.hideComment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id?.toString();

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.isHidden = !comment.isHidden;
    await comment.save();

    await writeLog({
      adminId,
      action: `comment:${comment.isHidden ? 'hide' : 'unhide'}`,
      details: {
        commentId: comment._id.toString(),
        insightId: comment.insightId?.toString?.() || String(comment.insightId || ''),
      },
    });

    return res.json({ message: 'Comment visibility updated', comment });
  } catch (err) {
    console.error('hideComment error:', err);
    return res.status(500).json({ message: 'Failed to update comment' });
  }
};

// DELETE /api/admin/comments/:id
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || req.user?._id?.toString();

    const comment = await Comment.findById(id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const insightId = comment.insightId?.toString?.() || String(comment.insightId || '');

    await comment.deleteOne();

    await writeLog({
      adminId,
      action: 'comment:delete',
      details: { commentId: id.toString(), insightId },
    });

    return res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('deleteComment error:', err);
    return res.status(500).json({ message: 'Failed to delete comment' });
  }
};
