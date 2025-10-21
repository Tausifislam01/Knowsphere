// backend/scripts/verifyAllUsers.js
/* eslint-disable no-console */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // load backend/.env
const mongoose = require('mongoose');

async function main() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('Missing MONGO_URI in .env');
    process.exit(1);
  }

  // Load User model (adjust path if your model lives elsewhere)
  const User = require('../models/User');

  await mongoose.connect(MONGO_URI);
  console.log('[mongo] connected');

  // Only touch users not already verified
  const filter = { emailVerified: { $ne: true } };
  const update = {
    $set: { emailVerified: true },
    $unset: {
      emailVerificationTokenHash: '',
      emailVerificationExpires: '',
    },
  };

  const result = await User.updateMany(filter, update);
  console.log(`Updated users: ${result.modifiedCount || result.nModified || 0}`);

  await mongoose.disconnect();
  console.log('[mongo] disconnected');
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
