const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Insight = require('../models/Insight');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied, no token provided' });
  jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// POST /api/comments - Create a comment or reply
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { insightId, text, parentCommentId } = req.body;
    if (!insightId || !text) {
      return res.status(400).json({ message: 'Insight ID and text are required' });
    }
    const insight = await Insight.findById(insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.visibility === 'private' && insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to comment on private insight' });
    }
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
    }
    const comment = new Comment({
      text,
      insightId,
      parentCommentId,
      userId: req.user.id,
    });
    await comment.save();
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'username');
    res.status(201).json({ message: 'Comment created successfully', comment: populatedComment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/comments/:insightId - Fetch comments for an insight
router.get('/:insightId', async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    const comments = await Comment.find({ insightId: req.params.insightId })
      .populate('userId', 'username')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;