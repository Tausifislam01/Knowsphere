const mongoose = require('mongoose');

const InsightSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String, trim: true }],
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isHidden: { type: Boolean, default: false }, // Added for admin hide/unhide functionality
  embedding: { type: [Number], default: [] } // AI embedding vector
});

module.exports = mongoose.model('Insight', InsightSchema);