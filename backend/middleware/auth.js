// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // ← correct relative path from /middleware

// User authentication middleware
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Support both token shapes: { user: { id } } or { id }
    const userId = decoded?.user?.id || decoded?.id || decoded?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Token payload missing user id' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Temporary or permanent ban guard
    const now = new Date();
    const isTempBanned = user.bannedUntil && now < new Date(user.bannedUntil);
    if (user.isBanned || isTempBanned) {
      return res.status(403).json({ message: 'User is banned' });
    }

    // Attach a plain user object and stable id string
    req.user = user.toObject();
    req.user.id = user._id.toString();

    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin-only middleware
const adminAuth = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { auth, adminAuth };