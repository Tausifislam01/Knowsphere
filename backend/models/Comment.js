const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  insightId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insight', required: true },
  parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);