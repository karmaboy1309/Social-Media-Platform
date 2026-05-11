const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// ──────────────────────────────────────────
// Core Middleware
// ──────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ──────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────
app.use('/api', require('./routes/testRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Social Media Platform API',
    version: '1.0.0',
    endpoints: {
      test: '/api/test',
      health: '/api/health',
      auth: '/api/auth',
      posts: '/api/posts',
      users: '/api/users',
    },
  });
});

// ──────────────────────────────────────────
// Error Handler (must be after routes)
// ──────────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   Social Media Platform API Server       ║
  ║──────────────────────────────────────────║
  ║   🚀 Port:        ${PORT}                    ║
  ║   🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(20)}║
  ║   📡 API:         http://localhost:${PORT}   ║
  ╚══════════════════════════════════════════╝
  `);
});
