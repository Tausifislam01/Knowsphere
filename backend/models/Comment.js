const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  text: { type: String, required: true },
  insightId: { type: Schema.Types.ObjectId, ref: 'Insight', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
  // Voting
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  downvotes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isHidden: { type: Boolean, default: false }
});

module.exports = mongoose.model('Comment', CommentSchema);