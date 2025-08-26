require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Attach io to requests so controllers can use req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
const authRoutes = require('./routes/authroutes');
const insightsRoutes = require('./routes/insightroutes');
const bookmarkRoutes = require('./routes/bookmarkroutes');
const reportRoutes = require('./routes/reportroutes');
const adminRoutes = require('./routes/adminroutes');
const notificationRoutes = require('./routes/notificationroutes');
const commentRoutes = require('./routes/comments');

app.use('/api/auth', authRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', commentRoutes); // comments route already has /comments in paths

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
