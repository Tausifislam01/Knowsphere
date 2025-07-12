const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Insight = require('../models/Insight');
const auth = require('../middleware/auth');

router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    user = new User({ username, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { username, email, fullName, bio, profilePicture, workplace, facebook, linkedin, github, interests, gender, skills, education, workExperience, languages, location, portfolio, connections, badges, availability, recentActivity, preferredTopics, genderPrivacy } = req.body;
    if (username) user.username = username;
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (bio) user.bio = bio;
    if (profilePicture) user.profilePicture = profilePicture;
    if (workplace) user.workplace = workplace;
    if (facebook) user.facebook = facebook;
    if (linkedin) user.linkedin = linkedin;
    if (github) user.github = github;
    if (interests) user.interests = interests;
    if (gender) user.gender = gender;
    if (skills) user.skills = skills;
    if (education) user.education = education;
    if (workExperience) user.workExperience = workExperience;
    if (languages) user.languages = languages;
    if (location) user.location = location;
    if (portfolio) user.portfolio = portfolio;
    if (connections) user.connections = connections;
    if (badges) user.badges = badges;
    if (availability) user.availability = availability;
    if (recentActivity) user.recentActivity = recentActivity;
    if (preferredTopics) user.preferredTopics = preferredTopics;
    if (typeof genderPrivacy === 'boolean') user.genderPrivacy = genderPrivacy;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/delete', auth, async (req, res) => {
  const session = await User.startSession();
  session.startTransaction();
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Invalid password' });
    }
    await User.deleteOne({ _id: req.user.id }).session(session);
    await Insight.deleteMany({ userId: req.user.id }).session(session);
    await session.commitTransaction();
    session.endSession();
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;