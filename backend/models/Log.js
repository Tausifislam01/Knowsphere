const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g., 'resolve_report', 'hide_insight', 'ban_user'
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null }, // ID of insight, comment, or user
  targetType: { type: String, enum: ['Insight', 'Comment', 'User', 'Report'], default: null },
  details: { type: String, required: true }, // Description of the action
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Log', LogSchema);