'use strict';
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Extract Bearer token safely
function getBearerToken(req) {
  const h = req.header('Authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

const auth = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.user?.id || decoded?.id || decoded?._id;
    if (!userId) return res.status(401).json({ message: 'Invalid token payload' });

    // Only change necessary for security: never include password in req.user
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { auth, adminAuth };