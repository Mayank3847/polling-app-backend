require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const pollRoutes = require('./routes/poll');
const voteRoutes = require('./routes/vote');

const Poll = require('./models/Poll');
const Session = require('./models/Session');

const app = express();
const server = http.createServer(app);

// CORS Configuration - UPDATED
const allowedOrigins = [
  'http://localhost:3000',
  'https://polling-app-ms7295.netlify.app',
  'https://695eca117d8d5a0008fa7eda--polling-app-ms7295.netlify.app', // Netlify preview URL
  process.env.CLIENT_URL
].filter(Boolean);

const io = socketIO(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('❌ CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Connect Database
connectDB();

// Middleware - UPDATED CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Origin:', req.headers.origin);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Polling API is running',
    status: 'OK',
    timestamp: new Date().toISOString(),
    allowedOrigins: allowedOrigins
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/poll', pollRoutes);
app.use('/api/vote', voteRoutes);

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path 
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Socket.IO
const sessionRooms = new Map();

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  socket.on('join-session', async (sessionCode) => {
    socket.join(sessionCode);
    if (!sessionRooms.has(sessionCode)) {
      sessionRooms.set(sessionCode, new Set());
    }
    sessionRooms.get(sessionCode).add(socket.id);
    
    try {
      const session = await Session.findOne({ sessionCode });
      if (session) {
        io.to(sessionCode).emit('participant-count', session.participants.length);
      }
    } catch (error) {
      console.error('Error in join-session:', error);
    }
    
    console.log(`User ${socket.id} joined session: ${sessionCode}`);
  });

  socket.on('launch-poll', async ({ sessionCode, pollId }) => {
    io.to(sessionCode).emit('poll-launched', pollId);
    
    try {
      const poll = await Poll.findById(pollId);
      if (poll && poll.timer) {
        setTimeout(async () => {
          poll.isActive = false;
          poll.closedAt = new Date();
          await poll.save();
          io.to(sessionCode).emit('poll-closed', pollId);
        }, poll.timer * 1000);
      }
    } catch (error) {
      console.error('Error in launch-poll:', error);
    }
  });

  socket.on('vote-submitted', async ({ sessionCode, pollId }) => {
    try {
      const poll = await Poll.findById(pollId);
      io.to(sessionCode).emit('results-updated', poll);
    } catch (error) {
      console.error('Error in vote-submitted:', error);
    }
  });

  socket.on('poll-created', ({ sessionCode, poll }) => {
    io.to(sessionCode).emit('new-poll', poll);
  });

  socket.on('disconnect', () => {
    sessionRooms.forEach((sockets, sessionCode) => {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          sessionRooms.delete(sessionCode);
        }
      }
    });
    console.log('❌ User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Allowed origins:`, allowedOrigins);
});