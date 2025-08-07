const express = require('express');
const router = express.Router();
const Insight = require('../models/Insight');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { auth } = require('../middleware/auth');

let io;
router.setIo = (socketIo) => {
  io = socketIo;
};

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map(tag => tag.trim()).filter(tag => tag);
  }
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  }
  return [];
};

router.get('/', auth, async (req, res) => {
  try {
    const insights = await Insight.find({ userId: req.user.id })
      .populate('userId', 'username profilePicture');
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/public', async (req, res) => {
  try {
    const insights = await Insight.find({ visibility: 'public', isHidden: false })
      .sort({ createdAt: -1 })
      .populate('userId', 'username profilePicture');
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/followed', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const followedUsers = user.following || [];
    const followedTags = user.followedTags || [];
    const insights = await Insight.find({
      $or: [
        { userId: { $in: followedUsers }, visibility: { $in: ['public', 'followers'] }, isHidden: false },
        { tags: { $in: followedTags }, visibility: 'public', isHidden: false },
      ],
    })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/tags/:tag', auth, async (req, res) => {
  try {
    const { tag } = req.params;
    const insights = await Insight.find({
      tags: tag,
      visibility: 'public',
      isHidden: false,
    })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.id).populate('userId', 'username profilePicture');
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    const user = await User.findById(req.user.id);
    if (insight.isHidden && insight.userId.toString() !== req.user.id && !user.isAdmin) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.visibility === 'private' && insight.userId.toString() !== req.user.id && !user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json(insight);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/user/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const targetUserId = req.params.userId;
    const isSelf = targetUserId === req.user.id;
    const isAdmin = user.isAdmin;
    const query = isSelf || isAdmin
      ? { userId: targetUserId }
      : { userId: targetUserId, visibility: 'public', isHidden: false };
    const insights = await Insight.find(query)
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
      tags: normalizeTags(tags),
      visibility: visibility || 'public',
      userId: req.user.id,
      upvotes: [],
      downvotes: [],
      commentCount: 0,
    });
    await insight.save();
    const populatedInsight = await Insight.findById(insight._id).populate('userId', 'username profilePicture');
    if (io) {
      io.emit('newInsight', populatedInsight);
    }
    res.status(201).json(populatedInsight);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { title, body, tags, visibility } = req.body;
  try {
    const insight = await Insight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    const user = await User.findById(req.user.id);
    if (insight.userId.toString() !== req.user.id && !user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    insight.title = title || insight.title;
    insight.body = body || insight.body;
    insight.tags = tags !== undefined ? normalizeTags(tags) : insight.tags;
    if (visibility && !['public', 'followers', 'private'].includes(visibility)) {
      return res.status(400).json({ message: 'Invalid visibility value' });
    }
    insight.visibility = visibility || insight.visibility;
    insight.updatedAt = Date.now();
    await insight.save();
    const populatedInsight = await Insight.findById(insight._id).populate('userId', 'username profilePicture');
    if (io) {
      io.emit('insightUpdated', populatedInsight);
    }
    res.json(populatedInsight);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    const user = await User.findById(req.user.id);
    if (insight.userId.toString() !== req.user.id && !user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    await Comment.deleteMany({ insightId: req.params.id });
    await Insight.deleteOne({ _id: req.params.id });
    if (io) {
      io.emit('insightDeleted', { id: req.params.id });
    }
    res.json({ message: 'Insight and associated comments deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
    if (insight.isHidden && insight.userId.toString() !== req.user.id) {
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
    if (io) {
      io.emit('insightVoted', { insightId: req.params.insightId, voteType, userId });
    }
    res.json({ message: 'Vote updated', insight: populatedInsight });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/hide', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const insight = await Insight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    insight.isHidden = !insight.isHidden;
    await insight.save();
    const populatedInsight = await Insight.findById(insight._id).populate('userId', 'username profilePicture');
    if (io) {
      io.emit('insightUpdated', populatedInsight);
    }
    res.json(populatedInsight);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;