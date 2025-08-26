// backend/routes/notificationroutes.js (MVC refactor: uses controller)
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const NotificationController = require('../controllers/notification.controller');

router.get('/', auth, NotificationController.listMine);
router.post('/:id/read', auth, NotificationController.markRead);
router.delete('/clear-read', auth, NotificationController.clearRead);

module.exports = router;
