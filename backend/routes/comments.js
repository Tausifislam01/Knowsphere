const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Insight = require('../models/Insight');
const auth = require('../middleware/auth');

// POST /api/insights/:insightId/comments - Create a comment or reply
router.post('/:insightId/comments', auth, async (req, res) => {
  try {
    const { insightId } = req.params;
    const { text, parentCommentId } = req.body;
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
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'username profilePicture');
    await Insight.findByIdAndUpdate(insightId, { $inc: { commentCount: 1 } });
    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/insights/:insightId/comments - Fetch comments for an insight
router.get('/:insightId/comments', auth, async (req, res) => {
  try {
    const { insightId } = req.params;
    const comments = await Comment.find({ insightId })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    console.error('Fetch comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/insights/comments/:commentId - Edit a comment
router.put('/comments/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to edit this comment' });
    }
    comment.text = text;
    comment.updatedAt = Date.now();
    await comment.save();
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'username profilePicture');
    res.json(populatedComment);
  } catch (error) {
    console.error('Edit comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/insights/comments/:commentId - Delete a comment
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to delete this comment' });
    }
    await Comment.deleteOne({ _id: commentId });
    await Insight.findByIdAndUpdate(comment.insightId, { $inc: { commentCount: -1 } });
    await Comment.deleteMany({ parentCommentId: commentId });
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;