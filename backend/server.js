const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Socket.IO Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret', (err, decoded) => {
    if (err) {
      console.error('Socket.IO auth error:', err.message); // Silent logging for debugging
      return next(new Error('Authentication error'));
    }
    socket.user = decoded;
    next();
  });
});

// Socket.IO Connection
io.on('connection', (socket) => {
  // Removed console.log for user connect/disconnect
  socket.on('disconnect', () => {});
});

// Routes
const authRoutes = require('./routes/authroutes');
const insightRoutes = require('./routes/insightroutes');
const bookmarkRoutes = require('./routes/bookmarkroutes');

app.use('/api/auth', authRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// Pass Socket.IO to insightroutes
insightRoutes.setIo(io);

// Default 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));