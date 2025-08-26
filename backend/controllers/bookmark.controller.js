// backend/controllers/bookmark.controller.js
const Bookmark = require('../models/Bookmark');
const Insight = require('../models/Insight');

// Create a bookmark
exports.create = async (req, res) => {
  const { insightId } = req.body;
  try {
    if (!insightId) {
      return res.status(400).json({ message: 'Insight ID is required' });
    }
    const insight = await Insight.findById(insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    const existing = await Bookmark.findOne({ userId: req.user.id, insightId });
    if (existing) {
      return res.status(400).json({ message: 'Insight already bookmarked' });
    }
    const bookmark = await Bookmark.create({ userId: req.user.id, insightId });
    const populated = await Bookmark.findById(bookmark._id).populate({
      path: 'insightId',
      populate: { path: 'userId', select: 'username profilePicture' },
    });
    if (req.io) {
      req.io.emit('bookmarkAdded', { userId: req.user.id, insightId });
    }
    return res.status(201).json(populated);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get current user's bookmarks
exports.listMine = async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user.id }).populate({
      path: 'insightId',
      match: { _id: { $exists: true } },
      populate: { path: 'userId', select: 'username profilePicture' },
    });
    const valid = bookmarks.filter(b => b.insightId !== null);
    return res.json(valid);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Admin: list all bookmarks
exports.listAll = async (req, res) => {
  try {
    const bookmarks = await Bookmark.find().populate({
      path: 'insightId',
      match: { _id: { $exists: true } },
      populate: { path: 'userId', select: 'username profilePicture' },
    }).populate('userId', 'username');
    const valid = bookmarks.filter(b => b.insightId !== null);
    return res.json(valid);
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Delete bookmark
exports.remove = async (req, res) => {
  try {
    const existing = await Bookmark.findOne({ userId: req.user.id, insightId: req.params.insightId });
    if (!existing) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }
    await Bookmark.deleteOne({ _id: existing._id });
    if (req.io) {
      req.io.emit('bookmarkRemoved', { userId: req.user.id, insightId: req.params.insightId });
    }
    return res.json({ message: 'Bookmark deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};
