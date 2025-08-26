// backend/routes/insightroutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Insight = require('../controllers/insight.controller');
const { suggestTags, generateEmbedding } = require('../middleware/aiMiddleware');

// AI helpers
router.post('/suggest-tags', auth, suggestTags, Insight.suggestTags);

// CRUD & querying
router.post('/', auth, generateEmbedding, Insight.create);
router.put('/:id', auth, generateEmbedding, Insight.update);
router.delete('/:id', auth, Insight.remove);

router.get('/public', Insight.listPublic);
router.get('/search', Insight.search);
router.get('/followed', auth, Insight.listFollowed);
router.get('/trending', Insight.trending);
router.get('/user/:id', auth, Insight.listByUser);
router.get('/tags/:tag', Insight.byTag);
router.get('/:id', Insight.getOne);

// Vote & moderation
router.post('/:id/vote', auth, Insight.vote);
router.put('/:id/hide', auth, Insight.toggleHide);

// Related
router.get('/:id/related', Insight.related);

module.exports = router;