// backend/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const crypto = require('crypto'); 
const { sendEmail } = require('../config/email');
const { template: verifyTpl } = require('../emails/verifyEmail');
const { template: resetTpl } = require('../emails/resetPassword');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


function isCloudinaryUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.endsWith('res.cloudinary.com');
  } catch {
    return false;
  }
}

function getPublicIdFromUrl(url) {
  try {
    const u = new URL(url);
    const p = u.pathname; 
    const idx = p.indexOf('/upload/');
    if (idx === -1) return null;
    let rest = p.slice(idx + '/upload/'.length);
    // strip version like v1712345678/
    rest = rest.replace(/^v\d+\//, '');
    // strip final extension only
    const lastDot = rest.lastIndexOf('.');
    if (lastDot > -1) rest = rest.slice(0, lastDot);
    return rest.replace(/^\/+|\/+$/g, '');
  } catch {
    return null;
  }
}

function bufferToDataURI(buffer, mimetype) {
  const base64 = buffer.toString('base64');
  return `data:${mimetype};base64,${base64}`;
}

const signToken = (user) => {
  const payload = { user: { id: user._id } };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// hash tokens at rest
function makeToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}
function minutesFromNow(min) {
  return new Date(Date.now() + min * 60 * 1000);
}


exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }

    // Check uniqueness on username OR email
    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      return res.status(400).json({ message: 'Username or email already in use' });
    }

    // Create the user (unverified by default)
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hash,
      emailVerified: true,
    });

    // // --- Send verification email ---
    // const { raw, hash: tokenHash } = makeToken();              // raw token for link, hash for DB
    // user.emailVerificationTokenHash = tokenHash;
    // user.emailVerificationExpires = minutesFromNow(30);         // 30-minute expiry
    // await user.save();

    // const verifyLink = `${process.env.APP_BASE_URL}/verify?token=${raw}`;
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Verify your email - KnowSphere',
    //   html: verifyTpl({ link: verifyLink, username: user.username }),
    // });

    // // Don’t auto-login; prompt verification
    return res.status(201).json({
      message: 'Account created. Email verification is currently disabled.',
    });
  } catch (e) {
    console.error('signup error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};


exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    // find user by username and include password for comparison
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // compare provided password with stored hash
    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // // ⛔ block login if the account hasn’t been verified
    // if (!user.emailVerified) {
    //   return res
    //     .status(403)
    //     .json({ message: 'Please verify your email before logging in.' });
    // }

 
    const token = signToken(user);
    return res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
      },
    });
  } catch (e) {
    console.error('login error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};


exports.resendVerification = async (req, res) => {
  try {
    return res.status(501).json({ message: 'Email verification is disabled.' });
// ORIGINAL IMPLEMENTATION BELOW (commented out)
//   const user = await User.findById(req.user.id);
//   if (!user) return res.status(404).json({ message: 'User not found' });
//   if (user.emailVerified) return res.json({ message: 'Already verified' });
//
//   const { raw, hash } = makeToken();
//   user.emailVerificationTokenHash = hash;
//   user.emailVerificationExpires = minutesFromNow(30);
//   await user.save();
//
//   const verifyLink = `${process.env.APP_BASE_URL}/verify?token=${raw}`;
//   await sendEmail({
//     to: user.email,
//     subject: 'Verify your email - KnowSphere',
//     html: verifyTpl({ link: verifyLink, username: user.username }),
//   });
//
//   return res.json({ message: 'Verification email sent' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyEmail = async (req, res) => {
  return res.status(501).json({ message: 'Email verification is disabled.' });
  /*
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.json({ message: 'Email verified successfully' });
  } catch (e) {
  */
  try {
    return res.status(500).json({ message: 'Server error' });
  } catch {}
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
    const userId = req.user.id;

    // Start from request body (strings) and normalize list fields
    const fields = { ...req.body };
    const listy = [
      'interests','skills','education','workExperience',
      'languages','connections','badges','recentActivity','preferredTopics'
    ];
    listy.forEach(k => {
      if (fields[k] && typeof fields[k] === 'string') {
        fields[k] = fields[k].split(',').map(s => s.trim()).filter(Boolean);
      }
    });
    // genderPrivacy from string -> boolean
    if (typeof fields.genderPrivacy === 'string') {
      fields.genderPrivacy = fields.genderPrivacy === 'true';
    }

    // Load current user to access previous avatar (if any)
    const current = await User.findById(userId).select('profilePicture profilePicturePublicId');
    if (!current) return res.status(404).json({ message: 'User not found' });

    // If a new file is present, upload to Cloudinary
    if (req.file) {
      if (req.file.buffer) {
        const dataURI = bufferToDataURI(req.file.buffer, req.file.mimetype);
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: 'knowsphere_profiles',
          resource_type: 'image',
          public_id: `${userId}-${Date.now()}`,
          overwrite: true,
        });
        fields.profilePicture = result.secure_url;
        fields.profilePicturePublicId = result.public_id;

        // Best-effort cleanup of old image
        if (current.profilePicturePublicId) {
          cloudinary.uploader.destroy(current.profilePicturePublicId).catch(() => {});
        } else if (current.profilePicture && isCloudinaryUrl(current.profilePicture)) {
          const oldId = getPublicIdFromUrl(current.profilePicture);
          if (oldId) cloudinary.uploader.destroy(oldId).catch(() => {});
        }
      } else if (req.file.path) {
        // Fallback: if some environments still set a disk path
        fields.profilePicture = req.file.path;
      }
    }

    const updated = await User.findByIdAndUpdate(userId, fields, { new: true }).select('-password');
    return res.json(updated);
  } catch (e) {
    console.error('updateProfile error:', e);
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
    const userId = req.user.id;

    const user = await User.findById(userId).select('profilePicture profilePicturePublicId');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Best-effort Cloudinary cleanup before deletion
    if (user.profilePicturePublicId) {
      await cloudinary.uploader.destroy(user.profilePicturePublicId).catch(() => {});
    } else if (user.profilePicture && isCloudinaryUrl(user.profilePicture)) {
      const publicId = getPublicIdFromUrl(user.profilePicture);
      if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    await User.deleteOne({ _id: userId });
    return res.json({ message: 'Profile deleted' });
  } catch (e) {
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  return res.status(501).json({ message: 'Forgot password is disabled.' });
  /*
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If that email exists, we sent a reset link.' });

    const { raw, hash } = makeToken();
    user.passwordResetTokenHash = hash;
    user.passwordResetExpires = minutesFromNow(30);
    await user.save();

    const resetLink = `${process.env.APP_BASE_URL}/reset/${raw}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your password - KnowSphere',
      html: resetTpl({ link: resetLink, username: user.username }),
    });

    return res.json({ message: 'If that email exists, we sent a reset link.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
  */
};

exports.resetPassword = async (req, res) => {
  return res.status(501).json({ message: 'Reset password is disabled.' });
  /*
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error' });
  }
  */
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