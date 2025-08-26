// backend/routes/comments.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const CommentCtrl = require('../controllers/comment.controller');

// List comments for an insight
router.get('/insights/:id/comments', CommentCtrl.listForInsight);

// Create a comment on an insight
router.post('/insights/:id/comments', auth, CommentCtrl.create);

// Edit comment (owner/admin) — support both route styles
router.put('/comments/:commentId', auth, CommentCtrl.update);
router.put('/insights/comments/:commentId', auth, CommentCtrl.update);

// Vote on a comment — support both route styles
router.post('/comments/:commentId/vote', auth, CommentCtrl.vote);
router.post('/insights/comments/:commentId/vote', auth, CommentCtrl.vote);

// Delete & Hide — support both route styles
router.delete('/comments/:commentId', auth, CommentCtrl.remove);
router.delete('/insights/comments/:commentId', auth, CommentCtrl.remove);

router.put('/comments/:commentId/hide', auth, CommentCtrl.toggleHide);
router.put('/insights/comments/:commentId/hide', auth, CommentCtrl.toggleHide);

module.exports = router;