// backend/controllers/admin.controller.js
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
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

// Log.details should be a STRING → stringify safely
function stringifyDetails(obj) {
  if (typeof obj === 'string') return obj;
  try {
    return JSON.stringify(obj ?? {});
  } catch {
    return String(obj ?? '');
  }
}

async function writeLog({ adminId, action, details }) {
  try {
    if (!Log) return;
    await Log.create({
      adminId: adminId?.toString?.() || String(adminId || ''),
      action: action || '',
      details: stringifyDetails(details),
    });
  } catch (e) {
    console.error('writeLog error:', e);
  }
}

// Notifications must never break the primary action
async function safeNotify(payload) {
  try {
    await Notification.create(payload);
  } catch (e) {
    console.error('Notification error:', e.message);
  }
}

/* ======================= Reports ======================= */

// GET /api/admin/reports/pending
// Optional pagination support: ?itemType=Insight|Comment&page=&limit=
exports.getPendingReports = async (req, res) => {
  try {
    const { itemType, page, limit } = req.query;

    const filter = { status: 'pending' };
    if (itemType && ['Insight', 'Comment'].includes(itemType)) {
      filter.reportedItemType = itemType;
    }

    const baseQuery = Report.find(filter)
      .sort({ createdAt: -1 })
      .populate('reporterId', 'username')
      .populate('resolvedBy', 'username')
      .populate({
        path: 'reportedItemId',
        populate: { path: 'userId', select: 'username isAdmin isBanned' },
      })
      .lean();

    const pageNum = Number(page);
    const limitNum = Number(limit);
    if (pageNum > 0 && limitNum > 0) {
      const [items, total] = await Promise.all([
        baseQuery.skip((pageNum - 1) * limitNum).limit(limitNum),
        Report.countDocuments(filter),
      ]);
      return res.json({ items, page: pageNum, limit: limitNum, total });
    }

    const reports = await baseQuery;
    return res.json(reports);
  } catch (err) {
    console.error('getPendingReports error:', err);
    return res.status(500).json({ message: 'Failed to load pending reports' });
  }
};

// GET /api/admin/reports/handled   (alias: /api/admin/handled-reports)
exports.getHandledReports = async (req, res) => {
  try {
    const { status, resolvedBy, startDate, endDate, itemType } = req.query;

    const filter = { status: { $in: ['resolved', 'dismissed'] } };
    if (status && ['resolved', 'dismissed'].includes(status)) filter.status = status;
    if (itemType && ['Insight', 'Comment'].includes(itemType)) filter.reportedItemType = itemType;
    if (resolvedBy && ensureObjectId(resolvedBy)) filter.resolvedBy = resolvedBy;

    const range = parseDateRange(startDate, endDate);
    if (range) {
      // Prefer resolvedAt in range. If missing (legacy), fall back to createdAt.
      filter.$or = [
        { resolvedAt: range },
        { $and: [{ resolvedAt: { $exists: false } }, { createdAt: range }] },
      ];
    }

    const page = Number.isFinite(+req.query.page) ? Math.max(1, parseInt(req.query.page, 10)) : null;
    const limit = Number.isFinite(+req.query.limit) ? Math.max(1, Math.min(100, parseInt(req.query.limit, 10))) : null;

    const baseQuery = Report.find(filter)
      .sort({ resolvedAt: -1, createdAt: -1 })
      .populate('reporterId', 'username')
      .populate('resolvedBy', 'username')
      .populate({
        path: 'reportedItemId',
        populate: { path: 'userId', select: 'username isAdmin isBanned' },
      })
      .lean();

    if (page && limit) {
      const [items, total] = await Promise.all([
        baseQuery.skip((page - 1) * limit).limit(limit),
        Report.countDocuments(filter),
      ]);
      return res.json({ items, page, limit, total });
    }

    const handled = await baseQuery;
    return res.json(handled);
  } catch (err) {
    console.error('getHandledReports error:', err);
    return res.status(500).json({ message: 'Failed to load handled reports' });
  }
};

// POST /api/admin/reports/:id/resolve
// Accepts { status: 'resolved'|'dismissed', note? } OR { dismiss: boolean, note? }
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
      action: `report:${status}`,
      details: { reportId: report._id.toString(), note: report.resolutionNote || '' },
    });

    // 🔔 Notify the reporter with a helpful link
    try {
      let link = '';
      if (report.reportedItemType === 'Comment') {
        const c = await Comment.findById(report.reportedItemId).lean();
        if (c) link = `/insights/${c.insightId}?commentId=${c._id}`;
      } else if (report.reportedItemType === 'Insight') {
        link = `/insights/${report.reportedItemId}`;
      }
      const type = status === 'resolved' ? 'report_resolved' : 'report_dismissed';
      const message =
        status === 'resolved'
          ? `Your report was resolved.${report.resolutionNote ? ' Note: ' + report.resolutionNote : ''}`
          : `Your report was dismissed.${report.resolutionNote ? ' Note: ' + report.resolutionNote : ''}`;

      await safeNotify({
        userId: report.reporterId,
        type,
        message,
        link,
        createdAt: new Date(),
      });
    } catch (e) {
      console.error('notify reporter error:', e.message);
    }

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
        { reportedItemType: 'Insight', reportedItemId: { $in: insightIds.map((x) => x._id) } },
        { reportedItemType: 'Comment', reportedItemId: { $in: commentIds.map((x) => x._id) } },
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
      details: {
        userId: user._id.toString(),
        until: user.bannedUntil,
        reason,
        incrementStrike: !!incrementStrike,
      },
    });

    // 🔔 Notify user
    await safeNotify({
      userId: user._id,
      type: 'user_banned',
      message: `You were banned${user.bannedUntil ? ` until ${user.bannedUntil.toLocaleString()}` : ''}.${reason ? ` Reason: ${reason}` : ''}`,
      link: '',
      createdAt: new Date(),
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

    // 🔔 Notify user
    await safeNotify({
      userId: user._id,
      type: 'user_unbanned',
      message: 'Your ban has been lifted.',
      link: '',
      createdAt: new Date(),
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
    const reason = (req.body?.reason || '').trim();

    const insight = await Insight.findById(id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    insight.isHidden = !insight.isHidden;
    await insight.save();

    await writeLog({
      adminId,
      action: `insight:${insight.isHidden ? 'hide' : 'unhide'}`,
      details: { insightId: insight._id.toString(), reason },
    });

    // 🔔 Notify author only when hiding
    if (insight.isHidden) {
      await safeNotify({
        userId: insight.userId,
        type: 'content_hidden',
        message: `Your insight was hidden by an administrator.${reason ? ' Reason: ' + reason : ''}`,
        link: `/insights/${insight._id}`,
        createdAt: new Date(),
      });
    }

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
    const reason = (req.body?.reason || '').trim();

    const insight = await Insight.findById(id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    const authorId = insight.userId;
    await insight.deleteOne();

    await writeLog({
      adminId,
      action: 'insight:delete',
      details: { insightId: id.toString(), reason },
    });

    // 🔔 Notify author
    await safeNotify({
      userId: authorId,
      type: 'content_deleted',
      message: `Your insight was deleted by an administrator.${reason ? ' Reason: ' + reason : ''}`,
      link: `/insights/${id}`,
      createdAt: new Date(),
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
    const reason = (req.body?.reason || '').trim();

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
        reason,
      },
    });

    // 🔔 Notify author only when hiding
    if (comment.isHidden) {
      await safeNotify({
        userId: comment.userId,
        type: 'content_hidden',
        message: `Your comment was hidden by an administrator.${reason ? ' Reason: ' + reason : ''}`,
        link: `/insights/${comment.insightId}?commentId=${comment._id}`,
        createdAt: new Date(),
      });
    }

    // Return populated shape similar to comment.controller
    const populated = await Comment.findById(comment._id)
      .populate('userId', 'username profilePicture')
      .lean();

    return res.json(populated);
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
    const reason = (req.body?.reason || '').trim();

    const comment = await Comment.findById(id).lean();
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    await Comment.deleteOne({ _id: id });

    await writeLog({
      adminId,
      action: 'comment:delete',
      details: { commentId: id.toString(), insightId: comment.insightId?.toString?.() || String(comment.insightId || ''), reason },
    });

    // 🔔 Notify author
    await safeNotify({
      userId: comment.userId,
      type: 'content_deleted',
      message: `Your comment was deleted by an administrator.${reason ? ' Reason: ' + reason : ''}`,
      link: `/insights/${comment.insightId}?commentId=${id}`,
      createdAt: new Date(),
    });

    return res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('deleteComment error:', err);
    return res.status(500).json({ message: 'Failed to delete comment' });
  }
};