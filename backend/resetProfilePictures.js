require('dotenv').config();

const { MongoClient } = require('mongodb');

async function resetProfilePictures() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined in .env file');
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('knowsphere');
    const result = await db.collection('users').updateMany(
      {
        profilePicture: {
          $exists: true,
          $ne: 'https://via.placeholder.com/150',
          $not: { $regex: '^https://res.cloudinary.com/dgkeor92x/image/upload/' }
        }
      },
      { $set: { profilePicture: 'https://via.placeholder.com/150' } }
    );
    console.log('Update result:', result);
    const users = await db.collection('users').find(
      {},
      { projection: { username: 1, profilePicture: 1, _id: 0 } }
    ).toArray();
    console.log('Users after update:', users);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

resetProfilePictures();