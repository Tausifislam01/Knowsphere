const mongoose = require('mongoose');

const InsightSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: { type: String },
  visibility: { type: String, enum: ['public', 'followers', 'private'], default: 'public' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Insight', InsightSchema);