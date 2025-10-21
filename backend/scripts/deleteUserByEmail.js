// backend/scripts/deleteUserByEmail.js
/* eslint-disable no-console */
const path = require('path');
const readline = require('readline');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');

// Cloudinary (optional cleanup)
let cloudinary;
try {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} catch (e) {
  cloudinary = null;
}

async function connectMongo() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
}

async function loadModelSafe(p) {
  try {
    // allow both relative and absolute-ish paths
    return require(p);
  } catch (e) {
    return null;
  }
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  const argv = process.argv.slice(2);
  const email = argv[0] || 'tausifislam202@gmail.com';
  const cascade = argv.includes('--cascade');

  console.log(`Will attempt to delete user with email: ${email} (cascade=${cascade})`);

  await connectMongo();
  console.log('[mongo] connected');

  // load User model (adjust path if your project differs)
  const User = await loadModelSafe(path.resolve(__dirname, '../models/User'));
  if (!User) {
    console.error('Could not load User model at ../models/User.js — aborting.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const user = await User.findOne({ email }).lean();
  if (!user) {
    console.log('No user found with that email. Exiting.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('User preview:');
  console.log({
    _id: user._id,
    username: user.username,
    email: user.email,
    profilePicture: user.profilePicture,
    profilePicturePublicId: user.profilePicturePublicId,
    createdAt: user.createdAt,
  });

  const ans = (await ask('Type "yes" to CONFIRM deletion of this user: ')).toLowerCase();
  if (ans !== 'yes') {
    console.log('Aborting (confirmation not given).');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Attempt Cloudinary cleanup
  if (user.profilePicturePublicId && cloudinary) {
    try {
      console.log('Attempting to delete Cloudinary public id:', user.profilePicturePublicId);
      const res = await cloudinary.uploader.destroy(user.profilePicturePublicId);
      console.log('Cloudinary destroy result:', res);
    } catch (e) {
      console.warn('Cloudinary deletion failed (continuing):', e.message || e);
    }
  }

  // Optionally cascade-delete related data if models exist
  const cascadeReport = [];

  if (cascade) {
    // These are common model filenames used in the project; adjust if different.
    const tryModels = [
      { name: 'Insight', path: path.resolve(__dirname, '../models/Insight') , query: { author: user._id } },
      { name: 'Comment', path: path.resolve(__dirname, '../models/Comment') , query: { author: user._id } },
      { name: 'Report', path: path.resolve(__dirname, '../models/Report') , query: { reporter: user._id } },
      { name: 'Bookmark', path: path.resolve(__dirname, '../models/Bookmark') , query: { user: user._id } },
    ];

    for (const m of tryModels) {
      const Model = await loadModelSafe(m.path);
      if (!Model) {
        console.log(`Model ${m.name} not found at ${m.path} — skipping.`);
        continue;
      }
      try {
        const result = await Model.deleteMany(m.query);
        const deleted = result.deletedCount ?? result.n ?? 0;
        cascadeReport.push({ model: m.name, deleted });
        console.log(`Deleted ${deleted} documents from ${m.name}`);
      } catch (e) {
        console.warn(`Failed to delete ${m.name}:`, e.message || e);
      }
    }
  } else {
    console.log('Cascade disabled — not touching related collections.');
  }

  // Finally delete the user
  try {
    const del = await User.deleteOne({ _id: user._id });
    console.log('User delete result:', del);
  } catch (e) {
    console.error('Failed to delete User:', e.message || e);
  }

  console.log('Summary:');
  console.log({ userDeletedId: user._id, cascadeReport });

  await mongoose.disconnect();
  console.log('[mongo] disconnected');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Error:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
