const mongoose = require('mongoose');
const Insight = require('./models/Insight');
const { callHuggingFaceAPI } = require('./config/ai');
require('dotenv').config();

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    await mongoose.connect(process.env.MONGO_URI, {});

  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkAndFixInsights = async () => {
  try {
    await connectDB();
    const insights = await Insight.find({});


    if (insights.length === 0) {
      console.warn('No insights found in the database');
      process.exit(0);
    }

    for (const insight of insights) {

      let needsUpdate = false;
      const updates = {};

      // Check title
      if (!insight.title || typeof insight.title !== 'string' || insight.title.trim() === '') {
        console.warn(`Insight ${insight._id} has invalid title: ${insight.title}`);
        updates.title = 'Untitled Insight';
        needsUpdate = true;
      }

      // Check body
      if (!insight.body || typeof insight.body !== 'string' || insight.body.trim() === '') {
        console.warn(`Insight ${insight._id} has invalid body: ${insight.body}`);
        updates.body = 'No content provided';
        needsUpdate = true;
      }

      // Check userId
      if (!insight.userId) {
        console.warn(`Insight ${insight._id} has missing userId`);
        // Note: You'll need to decide how to handle missing userId (e.g., skip or assign a default user)
        continue; // Skip for now to avoid errors
      }

      // Check visibility
      if (!insight.visibility || !['public', 'private'].includes(insight.visibility)) {
        console.warn(`Insight ${insight._id} has invalid visibility: ${insight.visibility}`);
        updates.visibility = 'public';
        needsUpdate = true;
      }

      // Check isHidden
      if (typeof insight.isHidden !== 'boolean') {
        console.warn(`Insight ${insight._id} has invalid isHidden: ${insight.isHidden}`);
        updates.isHidden = false;
        needsUpdate = true;
      }

      // Check tags
      if (!Array.isArray(insight.tags)) {
        console.warn(`Insight ${insight._id} has invalid tags: ${insight.tags}`);
        updates.tags = [];
        needsUpdate = true;
      }

      // Check embedding
      if (!insight.embedding || !Array.isArray(insight.embedding) || insight.embedding.length === 0) {

        const content = `${insight.title || 'Untitled'} ${insight.body || 'No content'}`.trim();
        try {
          const result = await callHuggingFaceAPI('sentence-transformers/all-MiniLM-L6-v2', { inputs: content });
          updates.embedding = result[0]; // Assuming result[0] is the embedding vector
          needsUpdate = true;
        } catch (error) {
          console.error(`Failed to generate embedding for insight ${insight._id}:`, error.message);
          updates.embedding = [];
        }
      }

      // Apply updates if needed
      if (needsUpdate) {
        try {
          await Insight.updateOne({ _id: insight._id }, { $set: updates });

        } catch (error) {
          console.error(`Failed to update insight ${insight._id}:`, error.message);
        }
      } else {

      }
    }


    process.exit(0);
  } catch (error) {
    console.error('Error in checkAndFixInsights:', error);
    process.exit(1);
  }
};

// Run the script
checkAndFixInsights();