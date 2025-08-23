const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authroutes');
const insightsRoutes = require('./routes/insightroutes');
const bookmarkRoutes = require('./routes/bookmarkroutes');
const commentsRoutes = require('./routes/comments');
const reportRoutes = require('./routes/reportroutes');
const adminRoutes = require('./routes/adminroutes');
const notificationRoutes = require('./routes/notificationroutes');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Pass io to routes that need it
insightsRoutes.setIo(io);

// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/insights', commentsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {

  socket.on('disconnect', () => {
    
  });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process on connection failure
  });

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});