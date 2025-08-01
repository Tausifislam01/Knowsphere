const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Insight = require('../models/Insight');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

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
    if (insight.isHidden && insight.userId.toString() !== req.user.id) {
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
      if (parentComment.isHidden && insight.userId.toString() !== req.user.id) {
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
router.get('/:insightId/comments', async (req, res) => {
  try {
    const { insightId } = req.params;
    const insight = await Insight.findById(insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    // Allow admins or insight owners to see hidden comments
    const token = req.header('Authorization')?.replace('Bearer ', '');
    let user = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.user.id);
      } catch (error) {
        console.warn('Invalid token provided:', error.message);
      }
    }
    const query = { insightId, isHidden: false };
    if (user && (user.isAdmin || insight.userId.toString() === user._id.toString())) {
      delete query.isHidden; // Admins/owners see all comments
    }
    const comments = await Comment.find(query)
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });
    console.log(`Fetched ${comments.length} comments for insight ${insightId}`);
    res.json(comments);
  } catch (error) {
    console.error('Fetch comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/insights/comments/:id - Fetch a single comment by ID
router.get('/comments/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('userId', 'username profilePicture')
      .populate('insightId', 'title');
    if (!comment) {
      console.log('Comment not found:', req.params.id);
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.isHidden && comment.insightId.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    console.log('Fetched comment:', comment._id);
    res.json(comment);
  } catch (error) {
    console.error('Fetch comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/insights/comments/all - Fetch all comments (admin-only)
router.get('/comments/all', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      console.log('Non-admin attempted to fetch all comments:', req.user.username);
      return res.status(403).json({ message: 'Admin access required' });
    }
    const comments = await Comment.find()
      .populate('userId', 'username profilePicture')
      .populate('insightId', 'title')
      .sort({ createdAt: -1 });
    console.log('Fetched all comments:', comments.length);
    res.json(comments);
  } catch (error) {
    console.error('Fetch all comments error:', error);
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

// PUT /api/insights/comments/:commentId/hide - Hide or unhide a comment (admin only)
router.put('/comments/:commentId/hide', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    comment.isHidden = !comment.isHidden;
    await comment.save();
    console.log(`Comment ${comment._id} ${comment.isHidden ? 'hidden' : 'unhidden'}`);
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'username profilePicture')
      .populate('insightId', 'title');
    res.json(populatedComment);
  } catch (error) {
    console.error('Hide comment error:', error);
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
    const user = await User.findById(req.user.id);
    if (comment.userId.toString() !== req.user.id && !user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to delete this comment' });
    }
    await Comment.deleteOne({ _id: commentId });
    await Insight.findByIdAndUpdate(comment.insightId, { $inc: { commentCount: -1 } });
    await Comment.deleteMany({ parentCommentId: commentId });
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;