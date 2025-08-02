const mongoose = require('mongoose');
const Comment = require('./models/Comment'); // Adjust the path to your Comment model

async function updateComments() {
  try {
    await mongoose.connect('mongodb://localhost:27017/yourDatabaseName', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const result = await Comment.updateMany(
      { isHidden: { $exists: false } }, // Find comments missing the isHidden field
      { $set: { isHidden: false } }    // Set isHidden to false
    );

    console.log(`Updated ${result.nModified} comments`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating comments:', error);
    process.exit(1);
  }
}

updateComments();