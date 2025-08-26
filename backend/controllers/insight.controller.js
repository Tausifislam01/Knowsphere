// backend/controllers/insight.controller.js
const Insight = require('../models/Insight');
const User = require('../models/User');

const populateInsight = (q) =>
  q.populate('userId', 'username profilePicture').lean();

/**
 * POST /api/insights/suggest-tags
 * Requires auth + aiMiddleware.suggestTags
 * Accepts: { content } or { title, body }
 * Returns: { tags: string[] }
 */
exports.suggestTags = async (req, res) => {
  try {
    const raw = (req.body?.content || '').trim();
    const combined = `${req.body?.title || ''} ${req.body?.body || ''}`.trim();
    const content = raw || combined;

    if (!content) {
      return res.status(400).json({ message: 'Content is required to suggest tags' });
    }

    // Prefer tags from aiMiddleware (req.suggestedTags)
    const tagsFromAi = Array.isArray(req.suggestedTags) ? req.suggestedTags : [];

    // Normalize, dedupe, clamp
    const clean = [...new Set(tagsFromAi.map(t => String(t).trim()))]
      .filter(Boolean)
      .slice(0, 10);

    return res.json({ tags: clean });
  } catch (e) {
    console.error('SuggestTags error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/insights
 * Requires auth + aiMiddleware.generateEmbedding
 */
exports.create = async (req, res) => {
  try {
    const { title, body, visibility = 'public', tags = [] } = req.body;
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    // aiMiddleware sets req.embedding (array) when available
    const embedding = Array.isArray(req.embedding) ? req.embedding : [];

    const insight = await Insight.create({
      title,
      body,
      tags,
      visibility,
      userId: req.user.id,
      embedding,
    });

    const populated = await populateInsight(Insight.findById(insight._id));
    if (req.io) req.io.emit('insightCreated', { insightId: insight._id });
    return res.status(201).json(populated);
  } catch (e) {
    console.error('Create insight error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /api/insights/:id
 * Requires auth + aiMiddleware.generateEmbedding (re-embed if provided)
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, visibility, tags } = req.body;

    const insight = await Insight.findById(id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    const isOwner = insight.userId.toString() === req.user.id;
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (typeof title === 'string') insight.title = title;
    if (typeof body === 'string') insight.body = body;
    if (Array.isArray(tags)) insight.tags = tags;
    if (visibility && ['public', 'private'].includes(visibility)) {
      insight.visibility = visibility;
    }

    // If middleware added an embedding, update it
    if (Array.isArray(req.embedding)) {
      insight.embedding = req.embedding;
    }

    await insight.save();
    const populated = await populateInsight(Insight.findById(insight._id));
    if (req.io) req.io.emit('insightUpdated', { insightId: insight._id });
    return res.json(populated);
  } catch (e) {
    console.error('Update insight error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE /api/insights/:id
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const insight = await Insight.findById(id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    const isOwner = insight.userId.toString() === req.user.id;
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Insight.deleteOne({ _id: id });
    if (req.io) req.io.emit('insightDeleted', { insightId: id });
    return res.json({ message: 'Insight deleted' });
  } catch (e) {
    console.error('Delete insight error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/insights/:id
 */
exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const insight = await populateInsight(Insight.findById(id));
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    const isOwner = String(insight.userId._id) === req.user?.id;
    if (insight.isHidden && !req.user?.isAdmin && !isOwner) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.visibility === 'private' && !isOwner && !req.user?.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    return res.json(insight);
  } catch (e) {
    console.error('Get one insight error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/insights/public
 */
exports.listPublic = async (req, res) => {
  try {
    const list = await populateInsight(
      Insight.find({ visibility: 'public', isHidden: { $ne: true } }).sort({ createdAt: -1 })
    );
    return res.json(list);
  } catch (e) {
    console.error('List public insights error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/insights/search?q=&tag=
 */
exports.search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const tag = (req.query.tag || '').trim();

    const cond = { visibility: 'public', isHidden: { $ne: true } };
    if (q) cond.$or = [{ title: { $regex: q, $options: 'i' } }, { body: { $regex: q, $options: 'i' } }];
    if (tag) cond.tags = tag;

    const list = await populateInsight(Insight.find(cond).sort({ createdAt: -1 }));
    return res.json(list);
  } catch (e) {
    console.error('Search insights error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/insights/followed
 * Requires auth
 */
exports.listFollowed = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const ids = (me.following || []).map(id => id.toString());
    const tags = me.followedTags || [];

    const cond = {
      $or: [{ userId: { $in: ids } }, { tags: { $in: tags } }],
      visibility: 'public',
      isHidden: { $ne: true },
    };

    const list = await populateInsight(Insight.find(cond).sort({ createdAt: -1 }));
    return res.json(list);
  } catch (e) {
    console.error('List followed insights error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/insights/trending?window=7d&limit=50&q=&tag=
 */
exports.trending = async (req, res) => {
  try {
    const days = parseInt(String(req.query.window || '7').replace('d', ''), 10) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const q = (req.query.q || '').trim();
    const tag = (req.query.tag || '').trim();

    const cond = { createdAt: { $gte: since }, visibility: 'public', isHidden: { $ne: true } };
    if (q) cond.$or = [{ title: { $regex: q, $options: 'i' } }, { body: { $regex: q, $options: 'i' } }];
    if (tag) cond.tags = tag;

    const list = await populateInsight(Insight.find(cond));
    const scored = list
      .map((i) => {
        const up = (i.upvotes || []).length;
        const down = (i.downvotes || []).length;
        const ageHours = (Date.now() - new Date(i.createdAt).getTime()) / 3600000;
        const score = (up - down) - ageHours * 0.05;
        return { ...i, _score: score };
      })
      .sort((a, b) => b._score - a._score);

    return res.json(scored.slice(0, parseInt(req.query.limit || '50', 10)));
  } catch (e) {
    console.error('Trending insights error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/insights/user/:id
 * Requires auth for private
 */
exports.listByUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const isOwnerOrAdmin = req.user?.id === userId || req.user?.isAdmin;

    const cond = { userId };
    if (!isOwnerOrAdmin) {
      cond.visibility = 'public';
      cond.isHidden = { $ne: true };
    }

    const list = await populateInsight(Insight.find(cond).sort({ createdAt: -1 }));
    return res.json(list);
  } catch (e) {
    console.error('List by user error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/insights/tags/:tag
 */
exports.byTag = async (req, res) => {
  try {
    const tag = decodeURIComponent(req.params.tag);
    const list = await populateInsight(
      Insight.find({ tags: tag, visibility: 'public', isHidden: { $ne: true } }).sort({ createdAt: -1 })
    );
    return res.json(list);
  } catch (e) {
    console.error('Insights by tag error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/insights/:id/vote
 * Requires auth
 */
exports.vote = async (req, res) => {
  try {
    const { voteType } = req.body; // 'upvote' | 'downvote'
    const { id } = req.params;

    const insight = await Insight.findById(id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    insight.upvotes = insight.upvotes || [];
    insight.downvotes = insight.downvotes || [];

    const uid = req.user.id;
    const hasUp = insight.upvotes.some((u) => u.toString() === uid);
    const hasDown = insight.downvotes.some((u) => u.toString() === uid);

    if (voteType === 'upvote') {
      if (hasUp) insight.upvotes = insight.upvotes.filter((u) => u.toString() !== uid);
      else {
        insight.upvotes.push(uid);
        if (hasDown) insight.downvotes = insight.downvotes.filter((u) => u.toString() !== uid);
      }
    } else if (voteType === 'downvote') {
      if (hasDown) insight.downvotes = insight.downvotes.filter((u) => u.toString() !== uid);
      else {
        insight.downvotes.push(uid);
        if (hasUp) insight.upvotes = insight.upvotes.filter((u) => u.toString() !== uid);
      }
    } else {
      return res.status(400).json({ message: 'Invalid voteType' });
    }

    await insight.save();
    if (req.io) req.io.emit('insightVoted', { insightId: insight._id });

    const populated = await populateInsight(Insight.findById(insight._id));
    return res.json(populated);
  } catch (e) {
    console.error('Vote insight error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /api/insights/:id/hide
 * Requires admin
 */
exports.toggleHide = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const insight = await Insight.findById(req.params.id);
    if (!insight) return res.status(404).json({ message: 'Insight not found' });

    insight.isHidden = !insight.isHidden;
    await insight.save();

    const populated = await populateInsight(Insight.findById(insight._id));
    if (req.io) req.io.emit('insightHidden', { insightId: insight._id, isHidden: insight.isHidden });

    return res.json(populated);
  } catch (e) {
    console.error('Toggle hide insight error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/insights/:id/related
 */
exports.related = async (req, res) => {
  try {
    const { id } = req.params;
    const base = await Insight.findById(id).lean();
    if (!base) return res.status(404).json({ message: 'Insight not found' });

    const tagCond = {
      tags: { $in: base.tags || [] },
      _id: { $ne: base._id },
      visibility: 'public',
      isHidden: { $ne: true },
    };

    const candidates = await Insight.find(tagCond).lean();

    const withScore = candidates
      .map((c) => {
        let score = 0;
        const commonTags = (c.tags || []).filter((t) => (base.tags || []).includes(t)).length;
        score += commonTags;

        if (
          Array.isArray(c.embedding) &&
          Array.isArray(base.embedding) &&
          c.embedding.length === base.embedding.length
        ) {
          const dot = c.embedding.reduce((s, v, i) => s + v * base.embedding[i], 0);
          const na = Math.sqrt(c.embedding.reduce((s, v) => s + v * v, 0)) || 1;
          const nb = Math.sqrt(base.embedding.reduce((s, v) => s + v * v, 0)) || 1;
          score += dot / (na * nb); // cosine similarity (unnormalized)
        }
        return { ...c, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 20);

    const ids = withScore.map((w) => w._id);
    const populated = await Insight.find({ _id: { $in: ids } })
      .populate('userId', 'username')
      .lean();

    const map = new Map(populated.map((p) => [String(p._id), p]));
    const ordered = withScore.map((w) => map.get(String(w._id))).filter(Boolean);

    return res.json(ordered);
  } catch (e) {
    console.error('Related insights error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};