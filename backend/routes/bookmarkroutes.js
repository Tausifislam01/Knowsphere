const express = require('express');
const router = express.Router();
const Bookmark = require('../models/Bookmark');
const Insight = require('../models/Insight');
const auth = require('../middleware/auth');

// Create a bookmark
router.post('/', auth, async (req, res) => {
  const { insightId } = req.body;
  try {
    if (!insightId) {
      return res.status(400).json({ message: 'Insight ID is required' });
    }
    const insight = await Insight.findById(insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    const existingBookmark = await Bookmark.findOne({ userId: req.user.id, insightId });
    if (existingBookmark) {
      return res.status(400).json({ message: 'Insight already bookmarked' });
    }
    const bookmark = new Bookmark({
      userId: req.user.id,
      insightId,
    });
    await bookmark.save();
    res.status(201).json(bookmark);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's bookmarks
router.get('/', auth, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user.id }).populate({
      path: 'insightId',
      populate: { path: 'userId', select: 'username' },
    });
    res.json(bookmarks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a bookmark
router.delete('/:insightId', auth, async (req, res) => {
  try {
    const bookmark = await Bookmark.findOne({ userId: req.user.id, insightId: req.params.insightId });
    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }
    await Bookmark.deleteOne({ _id: bookmark._id });
    res.json({ message: 'Bookmark deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;