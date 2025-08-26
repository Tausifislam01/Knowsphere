// backend/routes/bookmarkroutes.js (MVC refactor: uses controller)
const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const BookmarkController = require('../controllers/bookmark.controller');

router.post('/', auth, BookmarkController.create);
router.get('/', auth, BookmarkController.listMine);
router.get('/all', auth, adminAuth, BookmarkController.listAll);
router.delete('/:insightId', auth, BookmarkController.remove);

module.exports = router;
