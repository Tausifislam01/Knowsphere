// backend/controllers/report.controller.js
const Report = require('../models/Report');
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const User = require('../models/User');

exports.create = async (req, res) => {
  try {
    const { reportedItemType, reportedItemId, reason } = req.body;
    if (!['Insight', 'Comment'].includes(reportedItemType)) {
      return res.status(400).json({ message: 'Invalid item type' });
    }
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentReports = await Report.countDocuments({
      reporterId: req.user.id,
      createdAt: { $gte: oneHourAgo },
    });
    if (recentReports >= 5) {
      return res.status(429).json({ message: 'Report limit reached. Try later.' });
    }

    const duplicate = await Report.findOne({
      reporterId: req.user.id,
      reportedItemId,
      reportedItemType,
      status: 'pending',
    });
    if (duplicate) {
      return res.status(400).json({ message: 'Already reported this item' });
    }

    const Model = reportedItemType === 'Insight' ? Insight : Comment;
    const item = await Model.findById(reportedItemId);
    if (!item) return res.status(404).json({ message: `${reportedItemType} not found` });

    let author = null;
    try { author = await User.findById(item.userId).select('username'); } catch (_) {}

    const snapshot = reportedItemType === 'Insight'
      ? { insightId: item._id, title: item.title || '', authorId: item.userId || null, authorUsername: author?.username || '' }
      : { commentId: item._id, text: item.text || '', authorId: item.userId || null, authorUsername: author?.username || '' };

    const report = await Report.create({
      reportedItemType,
      reportedItemId,
      reporterId: req.user.id,
      reason: reason.trim(),
      contentSnapshot: snapshot,
    });

    return res.status(201).json({ message: 'Report submitted', report });
  } catch (error) {
    console.error('Create report error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
