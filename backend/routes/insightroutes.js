const express = require('express');
const router = express.Router();
const Insight = require('../models/Insight');
const auth = require('../middleware/auth');

// Get user-specific insights
router.get('/', auth, async (req, res) => {
  try {
    const insights = await Insight.find({ userId: req.user.id });
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get public insights
router.get('/public', async (req, res) => {
  try {
    const insights = await Insight.find();
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single insight by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json(insight);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create an insight
router.post('/', auth, async (req, res) => {
  const { title, body, tags } = req.body;
  try {
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    const insight = new Insight({
      title,
      body,
      tags,
      userId: req.user.id,
    });
    await insight.save();
    res.status(201).json(insight);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update an insight
router.put('/:id', auth, async (req, res) => {
  const { title, body, tags } = req.body;
  try {
    const insight = await Insight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    insight.title = title || insight.title;
    insight.body = body || insight.body;
    insight.tags = tags || insight.tags;
    await insight.save();
    res.json(insight);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an insight
router.delete('/:id', auth, async (req, res) => {
  try {
    const insight = await Insight.findById(req.params.id);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }
    if (insight.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    await Insight.deleteOne({ _id: req.params.id });
    res.json({ message: 'Insight deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;