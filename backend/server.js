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
  // Assume JWT verification (uncomment and configure with your JWT secret)
  // const jwt = require('jsonwebtoken');
  // jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
  //   if (err) return next(new Error('Authentication error'));
  //   socket.user = decoded;
  //   next();
  // });
  next(); // Temporary bypass for testing
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
const authRoutes = require('./routes/authroutes');
const insightRoutes = require('./routes/insightroutes');
const bookmarkRoutes = require('./routes/bookmarkroutes');

app.use('/api/auth', authRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// Example comment creation route (replace with actual route in insightroutes.js)
app.post('/api/insights/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, parentCommentId } = req.body;
    // Assume JWT middleware sets req.user
    // const userId = req.user.id;

    // Mock comment creation (replace with actual DB logic)
    const comment = {
      _id: Date.now().toString(),
      insightId: id,
      userId: {
        _id: 'user123', // Replace with req.user.id
        username: 'testuser',
        profilePicture: 'https://via.placeholder.com/40', // Replace with actual user data
      },
      text,
      parentCommentId: parentCommentId || null,
      createdAt: new Date(),
    };

    // Save to DB (replace with actual logic, e.g., Comment.create(comment))
    console.log('Saving comment:', comment);

    // Emit to all clients
    io.emit('newComment', comment);

    res.status(201).json(comment);
  } catch (error) {
    console.error('Comment creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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