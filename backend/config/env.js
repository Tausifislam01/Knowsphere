// backend/config/env.js
/* Centralized environment loader + helpers (aligned with your .env keys) */
const dotenv = require('dotenv');
dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),

  // Security / CORS / Limits
  CORS_ORIGINS: String(process.env.CORS_ORIGINS || ''),
  JSON_LIMIT: String(process.env.JSON_LIMIT || '100kb'),
  RL_GENERAL_MAX: Number(process.env.RL_GENERAL_MAX || 1000),
  RL_AUTH_MAX: Number(process.env.RL_AUTH_MAX || 100),

  // Database
  MONGO_URI: process.env.MONGO_URI,

  // Auth
  JWT_SECRET: process.env.JWT_SECRET,

  // Cloudinary (optional)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // Hugging Face (optional)
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '',

  // Feature toggles (optional)
  ENABLE_FORGOT_PASSWORD: String(process.env.ENABLE_FORGOT_PASSWORD || 'false').toLowerCase() === 'true',
};

['MONGO_URI', 'JWT_SECRET'].forEach((k) => {
  if (!env[k]) {
    // eslint-disable-next-line no-console
    console.error(`[config] Missing required env ${k}`);
    process.exit(1);
  }
});

function getAllowedOrigins() {
  return env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
}

module.exports = { env, getAllowedOrigins };
