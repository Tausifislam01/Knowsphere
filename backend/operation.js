// operation.js
// One-time migration script to backfill profilePicturePublicId for existing users.
// Run with:  node operation.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// --- helper: extract public_id from Cloudinary URL ---
function getPublicIdFromUrl(url) {
  try {
    if (!url) return null;
    const u = new URL(url);
    if (!u.hostname.endsWith('res.cloudinary.com')) return null;
    const idx = u.pathname.indexOf('/upload/');
    if (idx === -1) return null;
    let rest = u.pathname.slice(idx + '/upload/'.length);
    rest = rest.replace(/^v\d+\//, ''); // strip version prefix like v1712345678/
    const lastDot = rest.lastIndexOf('.');
    if (lastDot > -1) rest = rest.slice(0, lastDot);
    return rest.replace(/^\/+|\/+$/g, '');
  } catch {
    return null;
  }
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

  // console.log('Connected to MongoDB');

    const users = await User.find({
      profilePicture: { $exists: true, $ne: null },
      $or: [{ profilePicturePublicId: { $exists: false } }, { profilePicturePublicId: null }],
    });

  // console.log(`Found ${users.length} users to update...`);

    for (const user of users) {
      const pid = getPublicIdFromUrl(user.profilePicture);
      if (pid) {
        user.profilePicturePublicId = pid;
        await user.save();
  // console.log(`✔ Updated ${user.username || user._id} with public_id: ${pid}`);
      } else {
  // console.log(`⚠ Skipped ${user.username || user._id}, no valid Cloudinary URL`);
      }
    }

  // console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
