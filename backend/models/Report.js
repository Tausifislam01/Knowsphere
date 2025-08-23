// backend/models/Report.js
const mongoose = require('mongoose');

const ContentSnapshotSchema = new mongoose.Schema(
  {
    // For Insights
    insightId: { type: mongoose.Schema.Types.ObjectId, ref: 'Insight' },
    title: String,

    // For Comments
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    text: String,

    // Common author info taken at report time (so we can still display if deleted later)
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

    // moderation state
    status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },

    // snapshot of content at time of report (so handled reports remain visible even if original is deleted)
    contentSnapshot: ContentSnapshotSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);
