const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Insight = require('../models/Insight');
const User = require('../models/User');
const Comment = require('../models/Comment');

const { auth } = require('../middleware/auth');
const { suggestTags, generateEmbedding } = require('../middleware/aiMiddleware');
const { callHuggingFaceAPI } = require('../config/ai'); // (kept; safe if unused)

let io;
router.setIo = (socketIo) => {
  io = socketIo;
};

// -------------------- helpers --------------------
const OID = '([0-9a-fA-F]{24})';

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map(tag => tag.trim().toLowerCase()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags.split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean);
  }
  return [];
};

const cosineSimilarity = (a, b) => {
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
};

// ================== STATIC / NON-ID ROUTES FIRST ==================

// POST suggest tags (AI)
router.post('/suggest-tags', auth, suggestTags, async (req, res) => {
  try {
    res.json({ tags: req.suggestedTags });
  } catch (error) {
    console.error('Suggest tags error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET all public insights
router.get('/public', async (req, res) => {
  try {
    const insights = await Insight.find({
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null }
    })
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });
    res.json(insights);
  } catch (error) {
    console.error('Public insights error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET followed insights
router.get('/followed', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const followedUsers = user.following || [];
    const followedTags = user.followedTags || [];

    const insights = await Insight.find({
      $or: [
        { userId: { $in: followedUsers } },
        { tags: { $in: followedTags } }
      ],
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null }
    })
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });

    res.json(insights);
  } catch (error) {
    console.error('Followed insights error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET all insights for a specific user by userId
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const targetUserId = req.params.userId;
    const isSelf = targetUserId === req.user.id;
    const isAdmin = me?.isAdmin;

    const query = isSelf || isAdmin
      ? { userId: targetUserId }
      : { userId: targetUserId, visibility: 'public', isHidden: false };

    const insights = await Insight.find(query)
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });

    res.json(insights);
  } catch (error) {
    console.error('User insights error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET insights by tag
router.get('/tags/:tag', async (req, res) => {
  try {
    const tag = req.params.tag.trim().toLowerCase();
    if (!tag) return res.status(400).json({ message: 'Tag parameter is required and cannot be empty' });

    const insights = await Insight.find({
      tags: tag,
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null }
    })
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });

    res.json(insights);
  } catch (error) {
    console.error('Tag endpoint error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET search insights (by q and/or tag)
router.get('/search', async (req, res) => {
  try {
    const { q, tag } = req.query;
    const cleanQuery = q ? q.trim().replace(/[^a-zA-Z0-9\s]/g, '') : null;

    let normalizedTags = [];
    if (tag) {
      if (Array.isArray(tag)) normalizedTags = tag.flatMap(t => t.split(','));
      else if (typeof tag === 'string') normalizedTags = tag.split(',');
      normalizedTags = normalizedTags
        .map(t => t.trim().toLowerCase())
        .filter(t => t && !t.includes(':'));
    }

    if (!cleanQuery && normalizedTags.length === 0) {
      return res.status(400).json({ message: 'At least one valid query or tag parameter is required' });
    }

    const query = {
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null }
    };
    if (normalizedTags.length > 0) query.tags = { $in: normalizedTags };
    if (cleanQuery) {
      query.$or = [
        { title: { $regex: cleanQuery, $options: 'i' } },
        { body:  { $regex: cleanQuery, $options: 'i' } }
      ];
    }

    const insights = await Insight.find(query)
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });

    const filtered = insights.filter(i => i.userId && i.userId.username);
    res.json(filtered);
  } catch (error) {
    console.error('Search endpoint error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ================== ID ROUTES AFTER (constrained) ==================

// GET single insight
router.get(`/:id(${OID})`, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.id)
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false });

    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    if (insight.isHidden || insight.visibility === 'private') {
      const user = req.user ? await User.findById(req.user.id) : null;
      if (!user || (!user.isAdmin && insight.userId.toString() !== req.user?.id)) {
        return res.status(404).json({ message: 'Insight not found' });
      }
    }

    res.json(insight);
  } catch (error) {
    console.error('Single insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create insight
router.post('/', auth, generateEmbedding, suggestTags, async (req, res) => {
  try {
    const { title, body, tags, visibility } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'Title and body are required' });

    const normalizedTags = normalizeTags(tags || req.suggestedTags);
    const insight = new Insight({
      title,
      body,
      userId: req.user.id,
      tags: normalizedTags,
      visibility: visibility || 'public',
      embedding: req.embedding || [],
    });

    await insight.save();
    const populated = await Insight.findById(insight._id)
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false });

    if (io) io.emit('insightCreated', populated);
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT update insight
router.put(`/:id(${OID})`, auth, generateEmbedding, async (req, res) => {
  try {
    const { title, body, tags, visibility } = req.body;
    const insight = await Insight.findById(req.params.id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });
    if (insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to edit this insight' });
    }

    insight.title = title || insight.title;
    insight.body = body || insight.body;
    insight.tags = normalizeTags(tags) || insight.tags;
    insight.visibility = visibility || insight.visibility;
    insight.embedding = req.embedding || insight.embedding;
    insight.updatedAt = Date.now();

    await insight.save();
    const populated = await Insight.findById(insight._id)
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false });

    if (io) io.emit('insightUpdated', populated);
    res.json(populated);
  } catch (error) {
    console.error('Update insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE insight
router.delete(`/:id(${OID})`, auth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });
    if (insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to delete this insight' });
    }

    await Insight.deleteOne({ _id: req.params.id });
    if (io) io.emit('insightDeleted', { id: req.params.id });
    res.json({ message: 'Insight deleted' });
  } catch (error) {
    console.error('Delete insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST vote (upvote or downvote)
router.post(`/:id(${OID})/vote`, auth, async (req, res) => {
  try {
    const { voteType } = req.body;
    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ message: 'Invalid vote type' });
    }
    const insight = await Insight.findById(req.params.id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    const userId = req.user.id;
    if (voteType === 'upvote') {
      if (insight.upvotes.includes(userId)) {
        insight.upvotes = insight.upvotes.filter(id => id.toString() !== userId);
      } else {
        insight.upvotes.push(userId);
        insight.downvotes = insight.downvotes.filter(id => id.toString() !== userId);
      }
    } else {
      if (insight.downvotes.includes(userId)) {
        insight.downvotes = insight.downvotes.filter(id => id.toString() !== userId);
      } else {
        insight.downvotes.push(userId);
        insight.upvotes = insight.upvotes.filter(id => id.toString() !== userId);
      }
    }

    await insight.save();
    const populated = await Insight.findById(insight._id)
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false });

    if (io) io.emit('insightVoted', { insightId: insight._id, voteType, userId });
    res.json(populated);
  } catch (error) {
    console.error('Vote insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT hide/unhide insight (admin)
router.put(`/:id(${OID})/hide`, auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const insight = await Insight.findById(req.params.id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    insight.isHidden = !insight.isHidden;
    await insight.save();

    const populated = await Insight.findById(insight._id)
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false });

    if (io) io.emit('insightHidden', { id: insight._id, isHidden: insight.isHidden });
    res.json(populated);
  } catch (error) {
    console.error('Hide insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET related insights
router.get(`/:id(${OID})/related`, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const insight = await Insight.findById(req.params.id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    const relatedInsights = await Insight.find({
      _id: { $ne: insight._id },
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null }
    })
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false });

    const filteredRelated = relatedInsights.filter(rel => rel.userId && rel.userId.username);
    const results = filteredRelated
      .map(rel => {
        const similarity =
          insight.embedding && rel.embedding &&
          insight.embedding.length > 0 && rel.embedding.length > 0
            ? cosineSimilarity(insight.embedding, rel.embedding)
            : 0;
        const tagMatches = Array.isArray(insight.tags) && Array.isArray(rel.tags)
          ? insight.tags.filter(tag => rel.tags.includes(tag)).length
          : 0;
        const score = similarity > 0 ? similarity + tagMatches * 0.3 : tagMatches * 0.5;
        return { ...rel.toObject(), score };
      })
      .filter(x => x.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit));

    res.json(results);
  } catch (error) {
    console.error('Related insights error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
