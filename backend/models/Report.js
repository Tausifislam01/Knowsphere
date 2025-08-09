const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reportedItemType: { type: String, enum: ['Insight', 'Comment'], required: true },
  reportedItemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'reportedItemType' },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Added to store resolving admin
  resolvedAt: { type: Date, default: null }, // Added for filtering handled reports
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Report', ReportSchema);