// backend/routes/authroutes.js (MVC refactor)
const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Auth = require('../controllers/auth.controller');

// Basic auth
router.post('/signup', Auth.signup);
router.post('/login', Auth.login);
router.post('/forgot-password', Auth.forgotPassword);

// Profile
router.get('/profile', auth, Auth.getProfile);
router.get('/profile/:id', auth, Auth.getProfileById);
router.put('/profile', auth, Auth.updateProfile);
router.put('/change-password', auth, Auth.changePassword);
router.delete('/delete', auth, Auth.deleteProfile);

// Social
router.post('/follow/:userId', auth, Auth.followUser);
router.post('/unfollow/:userId', auth, Auth.unfollowUser);
router.post('/follow-tag/:tag', auth, Auth.followTag);
router.post('/unfollow-tag/:tag', auth, Auth.unfollowTag);

// Admin
router.post('/assign-admin/:userId', auth, adminAuth, Auth.assignAdmin);

// Discovery
router.get('/users', auth, Auth.listUsers);
router.get('/users/search', Auth.searchUsers);

module.exports = router;
