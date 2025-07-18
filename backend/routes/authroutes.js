
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

// Multer setup for file uploads
const upload = multer({ dest: 'uploads/' });

// Helper function to extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const afterUpload = parts[1];
    const publicId = afterUpload.replace(/^v\d+\//, '').replace(/\.\w+$/, '');
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Signup
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    user = new User({ 
      username, 
      email, 
      password, 
      followers: [], 
      following: [], 
      followedTags: [] 
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Profile
router.put('/profile', auth, upload.single('profilePicture'), async (req, res) => {
  const {
    username, email, fullName, bio, workplace, facebook,
    linkedin, github, interests, gender, skills, education,
    workExperience, languages, location, portfolio, connections,
    badges, availability, recentActivity, preferredTopics, genderPrivacy
  } = req.body;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldProfilePicture = user.profilePicture;
    let profilePicture = oldProfilePicture;

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'knowsphere_profiles',
          public_id: `${req.user.id}-${Date.now()}-${req.file.originalname}`,
        });
        profilePicture = result.secure_url;
        await fs.unlink(req.file.path);

        if (oldProfilePicture && 
            oldProfilePicture !== 'https://via.placeholder.com/150' && 
            oldProfilePicture.includes('cloudinary.com')) {
          const publicId = getPublicIdFromUrl(oldProfilePicture);
          if (publicId) {
            const deleteResult = await cloudinary.uploader.destroy(publicId);
            console.log('Old profile picture delete attempt:', { publicId, result: deleteResult });
            if (deleteResult.result === 'not found') {
              profilePicture = 'https://via.placeholder.com/150';
            }
          } else {
            profilePicture = 'https://via.placeholder.com/150';
          }
        }
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Failed to delete temporary file:', unlinkError);
        }
        return res.status(500).json({ message: 'Failed to upload image to Cloudinary' });
      }
    }

    user.username = username || user.username;
    user.email = email || user.email;
    user.fullName = fullName || user.fullName;
    user.bio = bio || user.bio;
    user.workplace = workplace || user.workplace;
    user.profilePicture = profilePicture;
    user.facebook = facebook || user.facebook;
    user.linkedin = linkedin || user.linkedin;
    user.github = github || user.github;
    user.interests = interests ? interests.split(',').map(item => item.trim()) : user.interests;
    user.gender = gender || user.gender;
    user.skills = skills ? skills.split(',').map(item => item.trim()) : user.skills;
    user.education = education ? education.split(',').map(item => item.trim()) : user.education;
    user.workExperience = workExperience ? workExperience.split(',').map(item => item.trim()) : user.workExperience;
    user.languages = languages ? languages.split(',').map(item => item.trim()) : user.languages;
    user.location = location || user.location;
    user.portfolio = portfolio || user.portfolio;
    user.connections = connections ? connections.split(',').map(item => item.trim()) : user.connections;
    user.badges = badges ? badges.split(',').map(item => item.trim()) : user.badges;
    user.availability = availability || user.availability;
    user.recentActivity = recentActivity ? recentActivity.split(',').map(item => item.trim()) : user.recentActivity;
    user.preferredTopics = preferredTopics ? preferredTopics.split(',').map(item => item.trim()) : user.preferredTopics;
    user.genderPrivacy = genderPrivacy !== undefined ? genderPrivacy === 'true' : user.genderPrivacy;

    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete temporary file:', unlinkError);
      }
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Profile
router.delete('/delete', auth, async (req, res) => {
  const { password } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    if (user.profilePicture && 
        user.profilePicture !== 'https://via.placeholder.com/150' && 
        user.profilePicture.includes('cloudinary.com')) {
      const publicId = getPublicIdFromUrl(user.profilePicture);
      if (publicId) {
        const deleteResult = await cloudinary.uploader.destroy(publicId);
        console.log('Profile picture deleted on account deletion:', { publicId, result: deleteResult });
      }
    }

    await User.deleteOne({ _id: user.id });
    res.json({ message: 'Profile deleted' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change Password
router.put('/change-password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow a user
router.post('/follow/:userId', auth, async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (req.user.id === req.params.userId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    if (currentUser.following.includes(req.params.userId)) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    currentUser.following.push(req.params.userId);
    userToFollow.followers.push(req.user.id);

    await currentUser.save();
    await userToFollow.save();

    const updatedUser = await User.findById(req.user.id)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');
    res.json({ message: 'User followed', user: updatedUser });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unfollow a user
router.post('/unfollow/:userId', auth, async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.userId);
    const currentUser = await User.findById(req.user.id);

    if (!userToUnfollow || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!currentUser.following.includes(req.params.userId)) {
      return res.status(400).json({ message: 'Not following this user' });
    }

    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== req.params.userId
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id) => id.toString() !== req.user.id
    );

    await currentUser.save();
    await userToUnfollow.save();

    const updatedUser = await User.findById(req.user.id)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');
    res.json({ message: 'User unfollowed', user: updatedUser });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Follow a tag
router.post('/follow-tag/:tag', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const tag = req.params.tag.trim().toLowerCase();
    if (currentUser.followedTags.includes(tag)) {
      return res.status(400).json({ message: 'Already following this tag' });
    }

    currentUser.followedTags.push(tag);
    await currentUser.save();

    const updatedUser = await User.findById(req.user.id)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');
    res.json({ message: 'Tag followed', user: updatedUser });
  } catch (error) {
    console.error('Follow tag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unfollow a tag
router.post('/unfollow-tag/:tag', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    const tag = req.params.tag.trim().toLowerCase();
    if (!currentUser.followedTags.includes(tag)) {
      return res.status(400).json({ message: 'Not following this tag' });
    }

    currentUser.followedTags = currentUser.followedTags.filter(
      (t) => t !== tag
    );
    await currentUser.save();

    const updatedUser = await User.findById(req.user.id)
      .select('-password')
      .populate('followers', 'username profilePicture')
      .populate('following', 'username profilePicture');
    res.json({ message: 'Tag unfollowed', user: updatedUser });
  } catch (error) {
    console.error('Unfollow tag error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;