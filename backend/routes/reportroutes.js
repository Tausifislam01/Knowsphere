const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const { auth } = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  try {
    const { reportedItemType, reportedItemId, reason } = req.body;
    if (!['Insight', 'Comment'].includes(reportedItemType)) {
      return res.status(400).json({ message: 'Invalid item type' });
    }
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const Model = reportedItemType === 'Insight' ? Insight : Comment;
    const item = await Model.findById(reportedItemId);
    if (!item) {
      return res.status(404).json({ message: `${reportedItemType} not found` });
    }

    const report = new Report({
      reportedItemType,
      reportedItemId,
      reporterId: req.user.id,
      reason,
    });
    await report.save();
    res.status(201).json({ message: 'Report submitted', report });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;