// backend/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) => {
  const payload = { user: { id: user._id } };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) return res.status(400).json({ message: 'Username or email already in use' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash });
    const token = signToken(user);
    return res.status(201).json({ token, user: { _id: user._id, username: user.username, isAdmin: user.isAdmin } });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'username and password are required' });
    const user = await User.findOne({ username }).select('+password');
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const token = signToken(user);
    return res.json({ token, user: { _id: user._id, username: user.username, isAdmin: user.isAdmin } });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('-password');
    if (!me) return res.status(404).json({ message: 'User not found' });
    return res.json(me);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getProfileById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isBanned && !req.user?.isAdmin && user._id.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Profile not available' });
    }
    return res.json(user);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Expect multipart form-data (Cloudinary handled elsewhere in original code)
    const fields = { ...req.body };
    // Split comma-separated arrays to arrays
    const listy = ['interests','skills','education','workExperience','languages','connections','badges','recentActivity','preferredTopics'];
    listy.forEach(k => {
      if (fields[k] && typeof fields[k] === 'string') {
        fields[k] = fields[k].split(',').map(s => s.trim()).filter(Boolean);
      }
    });
    // genderPrivacy from string -> boolean
    if (typeof fields.genderPrivacy === 'string') {
      fields.genderPrivacy = fields.genderPrivacy === 'true';
    }
    if (req.file && req.file.path) {
      fields.profilePicture = req.file.path;
    }
    const updated = await User.findByIdAndUpdate(req.user.id, fields, { new: true }).select('-password');
    return res.json(updated);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    }
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, user.password || '');
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: 'Password updated' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    await User.deleteOne({ _id: req.user.id });
    return res.json({ message: 'Profile deleted' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  // Stub, as in the original project
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    // In production: generate token, email user
    return res.json({ message: 'If this email exists, a reset link will be sent.' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.followUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    const me = await User.findById(req.user.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target._id.equals(me._id)) return res.status(400).json({ message: 'Cannot follow yourself' });
    if (!me.following) me.following = [];
    if (!target.followers) target.followers = [];
    if (me.following.some(id => id.equals(target._id))) {
      return res.status(400).json({ message: 'Already following' });
    }
    me.following.push(target._id);
    target.followers.push(me._id);
    await me.save(); await target.save();
    const fresh = await User.findById(me._id).select('-password');
    return res.json({ message: 'Followed', user: fresh });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    const me = await User.findById(req.user.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    me.following = (me.following || []).filter(id => !id.equals(target._id));
    target.followers = (target.followers || []).filter(id => !id.equals(me._id));
    await me.save(); await target.save();
    const fresh = await User.findById(me._id).select('-password');
    return res.json({ message: 'Unfollowed', user: fresh });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.followTag = async (req, res) => {
  try {
    const tag = decodeURIComponent(req.params.tag);
    const me = await User.findById(req.user.id);
    if (!me.followedTags) me.followedTags = [];
    if (me.followedTags.includes(tag)) return res.status(400).json({ message: 'Already following tag' });
    me.followedTags.push(tag);
    await me.save();
    const fresh = await User.findById(me._id).select('-password');
    return res.json({ message: 'Tag followed', user: fresh });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.unfollowTag = async (req, res) => {
  try {
    const tag = decodeURIComponent(req.params.tag);
    const me = await User.findById(req.user.id);
    me.followedTags = (me.followedTags || []).filter(t => t !== tag);
    await me.save();
    const fresh = await User.findById(me._id).select('-password');
    return res.json({ message: 'Tag unfollowed', user: fresh });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.assignAdmin = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });
    const u = await User.findByIdAndUpdate(req.params.userId, { isAdmin: true }, { new: true }).select('-password');
    if (!u) return res.status(404).json({ message: 'User not found' });
    return res.json({ message: 'Admin role granted', user: u });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find().select('username fullName profilePicture isAdmin');
    return res.json(users);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const excludeAdmins = String(req.query.excludeAdmins || '').toLowerCase() === 'true';
    const cond = q ? { username: { $regex: q, $options: 'i' } } : {};
    if (excludeAdmins) {
      cond.isAdmin = { $ne: true };
    }
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
    const users = await User.find(cond).limit(limit).select('username fullName profilePicture isAdmin');
    return res.json(users);
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};
