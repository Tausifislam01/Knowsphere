// backend/routes/authroutes.js (MVC-aligned)
const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const Auth = require('../controllers/auth.controller');
const rateLimit = require('express-rate-limit');


// Multer-only middleware (no Cloudinary logic here)
const media = require('../middleware/media');


// rate limits for email flows (prevents spam)
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5,                    // limit each IP to 5 requests/hour on these endpoints
  standardHeaders: true,
  legacyHeaders: false,
});


// Basic auth
router.post('/signup', Auth.signup);
router.post('/login', Auth.login);


// email verification + password reset
// router.post('/resend-verification', auth, emailLimiter, Auth.resendVerification);
// router.get('/verify-email/:token', Auth.verifyEmail);
// router.post('/forgot-password', emailLimiter, Auth.forgotPassword); // replace your old line if present
// router.post('/reset-password/:token', Auth.resetPassword);


// Profile
router.get('/profile', auth, Auth.getProfile);
router.get('/profile/:id', auth, Auth.getProfileById);
router.put('/profile', auth, media.uploadAvatar, Auth.updateProfile);
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