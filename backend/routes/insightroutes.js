// backend/routes/insightroutes.js
const express = require('express');
const router = express.Router();

// Models
const Insight = require('../models/Insight');
const User = require('../models/User');

// Auth & AI middleware
const { auth } = require('../middleware/auth');
const { suggestTags, generateEmbedding } = require('../middleware/aiMiddleware');

// Socket.io handle setter (called from server.js/app.js)
let io;
router.setIo = (socketIo) => {
  io = socketIo;
};

// -------------------- helpers --------------------
const OID = '([0-9a-fA-F]{24})';

const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  }
  return [];
};

const cosineSimilarity = (a, b) => {
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
};

// ======================================================================
// STATIC / NON-ID ROUTES
// ======================================================================

// AI: suggest tags (auth required)
router.post('/suggest-tags', auth, suggestTags, (req, res) => {
  return res.json({ tags: req.suggestedTags });
});

// Trending feed (vote+recency scoring)
router.get('/trending', async (req, res) => {
  try {
    const { window = '7d', limit = 50 } = req.query;

    // Compute "since" from window like 24h, 7d, 2w
    const now = new Date();
    const since = new Date(now);
    const m = /^(\d+)([dhw])$/.exec(String(window).toLowerCase());
    if (m) {
      const n = parseInt(m[1], 10);
      const unit = m[2];
      if (unit === 'd') since.setDate(now.getDate() - n);
      if (unit === 'h') since.setHours(now.getHours() - n);
      if (unit === 'w') since.setDate(now.getDate() - n * 7);
    } else {
      // default 7 days
      since.setDate(now.getDate() - 7);
    }

    const insights = await Insight.find({
      createdAt: { $gte: since },
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null },
    })
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });

    const scored = insights
      .filter((i) => i.userId && i.userId.username)
      .map((i) => {
        const ageHours = Math.max(1, (now - new Date(i.createdAt)) / (1000 * 60 * 60));
        const up = Array.isArray(i.upvotes) ? i.upvotes.length : 0;
        const down = Array.isArray(i.downvotes) ? i.downvotes.length : 0;
        const score = (up - down) / Math.pow(ageHours + 2, 1.5);
        return { item: i, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit, 10))
      .map(({ item }) => item);

    res.json(scored);
  } catch (error) {
    console.error('Trending insights error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public feed
router.get('/public', async (req, res) => {
  try {
    const insights = await Insight.find({
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null },
    })
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });
    res.json(insights);
  } catch (error) {
    console.error('Public insights error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Followed (people + tags)
router.get('/followed', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: 'User not found' });

    const followedUsers = me.following || [];
    const followedTags = me.followedTags || [];

    const insights = await Insight.find({
      $or: [{ userId: { $in: followedUsers } }, { tags: { $in: followedTags } }],
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null },
    })
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });

    res.json(insights);
  } catch (error) {
    console.error('Followed insights error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Insights by tag
router.get('/tags/:tag', async (req, res) => {
  try {
    const tag = String(req.params.tag || '').trim().toLowerCase();
    if (!tag) return res.status(400).json({ message: 'Tag parameter is required and cannot be empty' });

    const insights = await Insight.find({
      tags: tag,
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null },
    })
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });

    res.json(insights);
  } catch (error) {
    console.error('Tag endpoint error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Text/Tag search (regex-based; semantic disabled)
router.get('/search', async (req, res) => {
  try {
    const { q, tag } = req.query;
    const cleanQuery = q ? q.trim().replace(/[^a-zA-Z0-9\s]/g, '') : null;

    let normalizedTags = [];
    if (tag) {
      if (Array.isArray(tag)) normalizedTags = tag.flatMap((t) => String(t).split(','));
      else if (typeof tag === 'string') normalizedTags = tag.split(',');
      normalizedTags = normalizedTags.map((t) => t.trim().toLowerCase()).filter((t) => t && !t.includes(':'));
    }

    if (!cleanQuery && normalizedTags.length === 0) {
      return res.status(400).json({ message: 'At least one valid query or tag parameter is required' });
    }

    const query = { visibility: 'public', isHidden: false, userId: { $ne: null } };

    if (normalizedTags.length > 0) query.tags = { $in: normalizedTags };
    if (cleanQuery) {
      query.$or = [
        { title: { $regex: cleanQuery, $options: 'i' } },
        { body: { $regex: cleanQuery, $options: 'i' } },
      ];
    }

    const insights = await Insight.find(query)
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });

    const filtered = insights.filter((i) => i.userId && i.userId.username);
    res.json(filtered);
  } catch (error) {
    console.error('Search endpoint error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ======================================================================
// USER-SCOPED ROUTE (NEW)
// ======================================================================
/**
 * Get insights for a specific user.
 * - If requester is the same user or an admin: include all non-hidden insights.
 * - Otherwise: only public, non-hidden insights.
 */
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const requester = await User.findById(req.user.id).select('isAdmin').lean();
    const isOwner = req.user.id === userId;
    const isAdmin = !!requester?.isAdmin;

    const query = {
      userId,
      isHidden: false,
};

    if (!(isOwner || isAdmin)) {
      query.visibility = 'public';
    }

    const insights = await Insight.find(query)
      .populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false })
      .sort({ createdAt: -1 });

    res.json(insights);
  } catch (error) {
    console.error('User insights error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ======================================================================
// ID ROUTES
// ======================================================================

// Get single insight
router.get(`/:id(${OID})`, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.id).populate({
      path: 'userId',
      select: 'username profilePicture',
      strictPopulate: false,
    });

    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    // Do not expose hidden/private insights here.
    if (insight.isHidden || insight.visibility === 'private') {
      return res.status(404).json({ message: 'Insight not found' });
    }

    res.json(insight);
  } catch (error) {
    console.error('Single insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create insight (embeddings + tag suggestion)
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

    const populated = await Insight.findById(insight._id).populate({
      path: 'userId',
      select: 'username profilePicture',
      strictPopulate: false,
    });

    if (io) io.emit('insightCreated', populated);
    res.status(201).json(populated);
  } catch (error) {
    console.error('Create insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update insight (re-embed)
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

    const populated = await Insight.findById(insight._id).populate({
      path: 'userId',
      select: 'username profilePicture',
      strictPopulate: false,
    });

    if (io) io.emit('insightUpdated', populated);
    res.json(populated);
  } catch (error) {
    console.error('Update insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete insight
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

// Vote (upvote/downvote)
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

    const populated = await Insight.findById(insight._id).populate({
      path: 'userId',
      select: 'username profilePicture',
      strictPopulate: false,
    });

    if (io) io.emit('insightVoted', { insightId: insight._id, voteType, userId });
    res.json(populated);
  } catch (error) {
    console.error('Vote insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Hide / Unhide (admin)
router.put(`/:id(${OID})/hide`, auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.isAdmin) return res.status(403).json({ message: 'Admin access required' });

    const insight = await Insight.findById(req.params.id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    insight.isHidden = !insight.isHidden;
    await insight.save();

    const populated = await Insight.findById(insight._id).populate({
      path: 'userId',
      select: 'username profilePicture',
      strictPopulate: false,
    });

    if (io) io.emit('insightHidden', { id: insight._id, isHidden: insight.isHidden });
    res.json(populated);
  } catch (error) {
    console.error('Hide insight error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Related insights (embeddings + tag overlap)
router.get(`/:id(${OID})/related`, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const insight = await Insight.findById(req.params.id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    const relatedInsights = await Insight.find({
      _id: { $ne: insight._id },
      visibility: 'public',
      isHidden: false,
      userId: { $ne: null },
    }).populate({ path: 'userId', select: 'username profilePicture', strictPopulate: false });

    const filtered = relatedInsights.filter((rel) => rel.userId && rel.userId.username);

    const results = filtered
      .map((rel) => {
        const sim =
          insight.embedding?.length &&
          rel.embedding?.length &&
          insight.embedding.length === rel.embedding.length
            ? cosineSimilarity(insight.embedding, rel.embedding)
            : 0;

        const tagMatches =
          Array.isArray(insight.tags) && Array.isArray(rel.tags)
            ? insight.tags.filter((t) => rel.tags.includes(t)).length
            : 0;

        // Combine embedding similarity + tag overlap
        const score = sim > 0 ? sim + tagMatches * 0.3 : tagMatches * 0.5;

        return { ...rel.toObject(), score };
      })
      .filter((x) => x.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit, 10));

    res.json(results);
  } catch (error) {
    console.error('Related insights error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;