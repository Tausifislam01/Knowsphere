const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/authroutes');
const insightRoutes = require('./routes/insightroutes');
const bookmarkRoutes = require('./routes/bookmarkroutes');

app.use('/api/auth', authRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// Default 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));