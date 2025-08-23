// backend/routes/reportroutes.js
const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Create a new report (Insight or Comment), capturing a snapshot of the content
router.post('/', auth, async (req, res) => {
  try {
    const { reportedItemType, reportedItemId, reason } = req.body;

    if (!['Insight', 'Comment'].includes(reportedItemType)) {
      return res.status(400).json({ message: 'Invalid item type' });
    }
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    // ✅ Throttle: 5 reports per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentReports = await Report.countDocuments({
      reporterId: req.user.id,
      createdAt: { $gte: oneHourAgo },
    });
    if (recentReports >= 5) {
      return res.status(429).json({ message: 'Report limit reached. Try later.' });
    }

    // ✅ Dedupe: same reporter, same item, still pending
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
    if (!item) {
      return res.status(404).json({ message: `${reportedItemType} not found` });
    }

    // pull author + minimal fields for snapshot
    let author = null;
    try { author = await User.findById(item.userId).select('username'); } catch (_) {}

    const snapshot =
      reportedItemType === 'Insight'
        ? {
            insightId: item._id,
            title: item.title || '',
            authorId: item.userId || null,
            authorUsername: author?.username || '',
          }
        : {
            commentId: item._id,
            text: item.text || '',
            authorId: item.userId || null,
            authorUsername: author?.username || '',
          };

    const report = new Report({
      reportedItemType,
      reportedItemId,
      reporterId: req.user.id,
      reason: reason.trim(),
      contentSnapshot: snapshot,
    });

    await report.save();
    res.status(201).json({ message: 'Report submitted', report });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
