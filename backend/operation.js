const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://knowsphereuser:tausif123456@knowspheredb.4pvgqbx.mongodb.net/test?retryWrites=true&w=majority';

async function updateInsights() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB (test database)');

    // Check documents
    const totalDocs = await mongoose.connection.db.collection('insights').countDocuments();
    const missingIsHidden = await mongoose.connection.db.collection('insights').countDocuments({ isHidden: { $exists: false } });
    const hiddenDocs = await mongoose.connection.db.collection('insights').countDocuments({ isHidden: true });
    const nonHiddenDocs = await mongoose.connection.db.collection('insights').countDocuments({ isHidden: false });
    console.log('Total insights:', totalDocs);
    console.log('Insights missing isHidden:', missingIsHidden);
    console.log('Hidden insights (isHidden: true):', hiddenDocs);
    console.log('Non-hidden insights (isHidden: false):', nonHiddenDocs);

    // List sample documents
    const sampleDocs = await mongoose.connection.db.collection('insights').find({}, { projection: { _id: 1, title: 1, isHidden: 1 } }).limit(5).toArray();
    console.log('Sample insights:', sampleDocs);

    // Update documents missing isHidden
    const result = await mongoose.connection.db.collection('insights').updateMany(
      { isHidden: { $exists: false } },
      { $set: { isHidden: false } }
    );
    console.log('Update result:', result);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

async function insertTestComment() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for test comment');
    const insight = await mongoose.connection.db.collection('insights').findOne({ visibility: 'public', isHidden: false });
    if (!insight) {
      console.log('No public insights found for test comment');
      return;
    }
    const user = await mongoose.connection.db.collection('users').findOne({});
    if (!user) {
      console.log('No users found for test comment');
      return;
    }
    const result = await mongoose.connection.db.collection('comments').insertOne({
      text: 'Test comment',
      insightId: insight._id,
      userId: user._id,
      isHidden: false,
      createdAt: new Date(),
      parentCommentId: null
    });
    console.log('Inserted test comment:', result);
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error inserting test comment:', error);
  }
}

async function main() {
  await updateInsights();
  await insertTestComment();
}

main();