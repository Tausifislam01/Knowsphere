const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: false },
  workplace: { type: String, required: false },
  profilePicture: { type: String, required: false },
  facebook: { type: String, required: false },
  linkedin: { type: String, required: false },
  github: { type: String, required: false },
  bio: { type: String, required: false },
  interests: { type: String, required: false },
  gender: { type: String, required: false },
  skills: { type: String, required: false },
  education: { type: String, required: false },
  workExperience: { type: String, required: false },
  languages: { type: String, required: false },
  location: { type: String, required: false },
  portfolio: { type: String, required: false },
  connections: { type: String, required: false },
  badges: { type: String, required: false },
  availability: { type: String, required: false },
  recentActivity: { type: String, required: false },
  preferredTopics: { type: String, required: false },
  genderPrivacy: { type: Boolean, required: false, default: true },
  createdAt: { type: Date, required: false, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);