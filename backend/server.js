require('dotenv').config();

// Log environment variables immediately after loading dotenv to confirm they're available
console.log('Environment variables loaded:', {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authroutes');
const insightRoutes = require('./routes/insightroutes');
const bookmarkRoutes = require('./routes/bookmarkroutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// Start server
app.listen(5000, () => console.log('Server running on port 5000'));