const express = require('express');
const router = express.Router();
const Insight = require('../models/Insight');
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

// Initialize Socket.IO
let io;
router.setIo = (socketIo) => {
  io = socketIo;
};

// Get user-specific insights
router.get('/', auth, async (req, res) => {
  try {
    const insights = await Insight.find({ userId: req.user.id }).populate('userId', 'username profilePicture');
    res.json(insights);
  } catch (error) {
    console.error('Get user insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public insights
router.get('/public', async (req, res) => {
  try {
    const insights = await Insight.find({ visibility: 'public' })
      .sort({ createdAt: -1 })
      .populate('userId', 'username profilePicture');
    res.json(insights);
  } catch (error) {
    console.error('Get public insights error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single insight by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.id).populate('userId', 'username profilePicture');
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.visibility === 'private' && insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json(insight);
  } catch (error) {
    console.error('Get insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create an insight
router.post('/', auth, async (req, res) => {
  const { title, body, tags, visibility } = req.body;
  try {
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    if (visibility && !['public', 'followers', 'private'].includes(visibility)) {
      return res.status(400).json({ message: 'Invalid visibility value' });
    }
    const insight = new Insight({
      title,
      body,
      tags: tags || '',
      visibility: visibility || 'public',
      userId: req.user.id,
      upvotes: [],
      downvotes: [],
      commentCount: 0,
    });
    await insight.save();
    const populatedInsight = await Insight.findById(insight._id).populate('userId', 'username profilePicture');
    res.status(201).json(populatedInsight);
  } catch (error) {
    console.error('Create insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an insight
router.put('/:id', auth, async (req, res) => {
  const { title, body, tags, visibility } = req.body;
  try {
    const insight = await Insight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    insight.title = title || insight.title;
    insight.body = body || insight.body;
    insight.tags = tags !== undefined ? tags : insight.tags;
    if (visibility && !['public', 'followers', 'private'].includes(visibility)) {
      return res.status(400).json({ message: 'Invalid visibility value' });
    }
    insight.visibility = visibility || insight.visibility;
    await insight.save();
    const populatedInsight = await Insight.findById(insight._id).populate('userId', 'username profilePicture');
    res.json(populatedInsight);
  } catch (error) {
    console.error('Update insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an insight
router.delete('/:id', auth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    await Comment.deleteMany({ insightId: req.params.id });
    await Insight.deleteOne({ _id: req.params.id });
    res.json({ message: 'Insight and associated comments deleted' });
  } catch (error) {
    console.error('Delete insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upvote or downvote an insight
router.post('/:insightId/vote', auth, async (req, res) => {
  try {
    const { voteType } = req.body;
    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ message: 'Invalid vote type' });
    }
    const insight = await Insight.findById(req.params.insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.visibility === 'private' && insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to vote on private insight' });
    }
    const userId = req.user.id;
    if (voteType === 'upvote') {
      if (insight.upvotes.includes(userId)) {
        insight.upvotes = insight.upvotes.filter((id) => id.toString() !== userId);
      } else {
        insight.upvotes.push(userId);
        insight.downvotes = insight.downvotes.filter((id) => id.toString() !== userId);
      }
    } else {
      if (insight.downvotes.includes(userId)) {
        insight.downvotes = insight.downvotes.filter((id) => id.toString() !== userId);
      } else {
        insight.downvotes.push(userId);
        insight.upvotes = insight.upvotes.filter((id) => id.toString() !== userId);
      }
    }
    await insight.save();
    const populatedInsight = await Insight.findById(insight._id).populate('userId', 'username profilePicture');
    res.json({ message: 'Vote updated', insight: populatedInsight });
  } catch (error) {
    console.error('Vote insight error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a comment or reply
router.post('/:insightId/comments', auth, async (req, res) => {
  const { text, parentCommentId } = req.body;
  try {
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    const insight = await Insight.findById(req.params.insightId);
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
      if (parentComment.insightId.toString() !== req.params.insightId) {
        return res.status(400).json({ message: 'Parent comment does not belong to this insight' });
      }
    }
    const comment = new Comment({
      text,
      insightId: req.params.insightId,
      parentCommentId,
      userId: req.user.id,
    });
    await comment.save();
    // Increment commentCount for both comments and replies
    insight.commentCount = (insight.commentCount || 0) + 1;
    await insight.save();
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'username profilePicture');
    io.emit('newComment', {
      ...populatedComment.toObject(),
      insightId: req.params.insightId,
    });
    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for an insight
router.get('/:insightId/comments', auth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.visibility === 'private' && insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const comments = await Comment.find({ insightId: req.params.insightId })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a comment
router.put('/comments/:commentId', auth, async (req, res) => {
  const { text } = req.body;
  try {
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    comment.text = text;
    comment.updatedAt = Date.now();
    await comment.save();
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'username profilePicture');
    res.json(populatedComment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a comment
router.delete('/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const replyCount = await Comment.countDocuments({ parentCommentId: req.params.commentId });
    await Comment.deleteMany({ parentCommentId: req.params.commentId });
    await Comment.deleteOne({ _id: req.params.commentId });
    // Update commentCount
    await Insight.findByIdAndUpdate(comment.insightId, {
      $inc: { commentCount: -(1 + replyCount) },
    });
    res.json({ message: 'Comment and replies deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;