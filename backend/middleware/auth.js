const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded); // Debug: Log token payload
    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
      console.log('User not found for ID:', decoded.user.id);
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.isBanned) {
      console.log('User is banned:', user.username);
      return res.status(403).json({ message: 'User is banned' });
    }
    req.user = { id: user._id.toString(), ...user.toObject() }; // Explicitly set id
    console.log('Auth middleware - User:', { id: req.user.id, username: user.username, isAdmin: user.isAdmin });
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminAuth = (req, res, next) => {
  console.log('AdminAuth middleware - Checking user:', { id: req.user.id, isAdmin: req.user.isAdmin });
  if (!req.user.isAdmin) {
    console.log('Admin access denied for user:', req.user.username);
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { auth, adminAuth };