// backend/controllers/comment.controller.js
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Insight = require('../models/Insight');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id));
const populateComment = (q) =>
  q.populate('userId', 'username profilePicture').lean();

/**
 * GET /api/insights/:id/comments
 * List comments for an insight (hidden comments only to admins/owner)
 */
exports.listForInsight = async (req, res) => {
  try {
    const insightId = req.params.id;
    if (!isValidObjectId(insightId)) {
      return res.status(400).json({ message: 'Invalid insight id' });
    }

    const insight = await Insight.findById(insightId).lean();
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    const isOwner = req.user && String(insight.userId) === req.user.id;
    if (insight.visibility === 'private' && !isOwner && !req.user?.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const cond = { insightId };
    if (!req.user?.isAdmin && !isOwner) cond.isHidden = { $ne: true };

    const list = await populateComment(Comment.find(cond).sort({ createdAt: 1 }));
    return res.json(list);
  } catch (e) {
    console.error('List comments error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/insights/:id/comments
 * body: { text, parentCommentId? }
 */
exports.create = async (req, res) => {
  try {
    const insightId = req.params.id;
    const { text, parentCommentId = null } = req.body;

    if (!isValidObjectId(insightId)) {
      return res.status(400).json({ message: 'Invalid insight id' });
    }
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const insight = await Insight.findById(insightId).lean();
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    const isOwner = req.user && String(insight.userId) === req.user.id;
    if (
      (insight.isHidden && !req.user?.isAdmin && !isOwner) ||
      (insight.visibility === 'private' && !isOwner && !req.user?.isAdmin)
    ) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const comment = await Comment.create({
      insightId,
      userId: req.user.id,
      text: String(text).trim(),
      parentCommentId: parentCommentId || null,
      isHidden: false,
      upvotes: [],
      downvotes: [],
    });

    const populated = await populateComment(Comment.findById(comment._id));
    if (req.io) req.io.emit('commentCreated', { insightId, commentId: comment._id });
    return res.status(201).json(populated);
  } catch (e) {
    console.error('Create comment error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /api/comments/:commentId    (also supported: /api/insights/comments/:commentId)
 * body: { text }
 * Owner or admin can edit
 */
exports.update = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid comment id' });
    }
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner = comment.userId && String(comment.userId) === req.user.id;
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    comment.text = String(text).trim();
    comment.updatedAt = new Date();
    await comment.save();

    const populated = await populateComment(Comment.findById(comment._id));
    if (req.io) req.io.emit('commentUpdated', populated);
    return res.json(populated);
  } catch (e) {
    console.error('Update comment error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/comments/:commentId/vote  (also: /api/insights/comments/:commentId/vote)
 * body: { voteType: 'upvote' | 'downvote' }
 */
exports.vote = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { voteType } = req.body;

    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid comment id' });
    }
    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ message: 'Invalid voteType' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.upvotes = comment.upvotes || [];
    comment.downvotes = comment.downvotes || [];
    const uid = req.user.id;

    const hasUp = comment.upvotes.some((u) => String(u) === uid);
    const hasDown = comment.downvotes.some((u) => String(u) === uid);

    if (voteType === 'upvote') {
      if (hasUp) comment.upvotes = comment.upvotes.filter((u) => String(u) !== uid);
      else {
        comment.upvotes.push(uid);
        if (hasDown) comment.downvotes = comment.downvotes.filter((u) => String(u) !== uid);
      }
    } else {
      if (hasDown) comment.downvotes = comment.downvotes.filter((u) => String(u) !== uid);
      else {
        comment.downvotes.push(uid);
        if (hasUp) comment.upvotes = comment.upvotes.filter((u) => String(u) !== uid);
      }
    }

    await comment.save();
    const populated = await populateComment(Comment.findById(comment._id));
    if (req.io) req.io.emit('commentVoted', { insightId: comment.insightId, commentId: comment._id });
    return res.json(populated);
  } catch (e) {
    console.error('Vote comment error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE /api/comments/:commentId  (also: /api/insights/comments/:commentId)
 * Owner or admin can delete
 */
exports.remove = async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid comment id' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner = comment.userId && String(comment.userId) === req.user.id;
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Comment.deleteOne({ _id: commentId });
    if (req.io) req.io.emit('commentDeleted', { insightId: comment.insightId, commentId });
    return res.json({ message: 'Comment deleted' });
  } catch (e) {
    console.error('Delete comment error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /api/comments/:commentId/hide  (also: /api/insights/comments/:commentId/hide)
 * Admin only — toggle hidden state
 */
exports.toggleHide = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { commentId } = req.params;
    if (!isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid comment id' });
    }
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.isHidden = !comment.isHidden;
    await comment.save();

    const populated = await populateComment(Comment.findById(comment._id));
    if (req.io) req.io.emit('commentHidden', { insightId: comment.insightId, commentId, isHidden: comment.isHidden });
    return res.json(populated);
  } catch (e) {
    console.error('Toggle hide comment error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};