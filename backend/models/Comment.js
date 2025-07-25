const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  text: { type: String, required: true },
  insightId: { type: Schema.Types.ObjectId, ref: 'Insight', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isHidden: { type: Boolean, default: false } // Added for admin hide/unhide functionality
});

module.exports = mongoose.model('Comment', CommentSchema);