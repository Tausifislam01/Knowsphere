const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String },
  bio: { type: String },
  profilePicture: { type: String, default: 'https://via.placeholder.com/150' },
  workplace: { type: String },
  facebook: { type: String },
  linkedin: { type: String },
  github: { type: String },
  interests: { type: [String], default: [] },
  gender: { type: String },
  skills: { type: [String], default: [] },
  education: { type: [String], default: [] },
  workExperience: { type: [String], default: [] },
  languages: { type: [String], default: [] },
  location: { type: String },
  portfolio: { type: String },
  connections: { type: [String], default: [] },
  badges: { type: [String], default: [] },
  availability: { type: String },
  recentActivity: { type: [String], default: [] },
  preferredTopics: { type: [String], default: [] },
  genderPrivacy: { type: Boolean, default: false },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  followedTags: [{ type: String, default: [] }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);