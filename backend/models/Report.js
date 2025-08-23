const mongoose = require('mongoose');

const ContentSnapshotSchema = new mongoose.Schema(
  {
    insightId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insight' },
    title: String,
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    text: String,
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorUsername: String,
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    reportedItemType: { type: String, enum: ['Insight', 'Comment'], required: true },
    reportedItemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'reportedItemType' },
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },

    status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    // 🚀 NEW FIELD
    resolutionNote: { type: String },

    contentSnapshot: ContentSnapshotSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);
