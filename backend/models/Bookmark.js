const mongoose = require('mongoose');

const BookmarkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  insightId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insight', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bookmark', BookmarkSchema);