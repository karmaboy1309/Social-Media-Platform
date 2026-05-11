const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// ──────────────────────────────────────────
// 1. Load Environment Variables (FIRST)
// ──────────────────────────────────────────
dotenv.config();

const validateEnv = require('./config/validateEnv');
const { connectDB, disconnectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Validate all required env vars before anything else
const config = validateEnv();

// ──────────────────────────────────────────
// 2. Initialize Express App
// ──────────────────────────────────────────
const app = express();

// ──────────────────────────────────────────
// 3. Core Middleware
// ──────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ──────────────────────────────────────────
// 4. API Routes
// ──────────────────────────────────────────
app.use('/api', require('./routes/testRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Root route — API overview
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Social Media Platform API',
    version: '1.0.0',
    environment: config.NODE_ENV,
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
// 5. Error Handler (must be after routes)
// ──────────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────────
// 6. Start Server ONLY After DB Connects
// ──────────────────────────────────────────
const startServer = async () => {
  try {
    // Wait for MongoDB connection before starting
    await connectDB();

    const server = app.listen(config.PORT, () => {
      console.log(`
  ╔══════════════════════════════════════════════╗
  ║     🚀 SOCIAL MEDIA PLATFORM API SERVER     ║
  ╠══════════════════════════════════════════════╣
  ║                                              ║
  ║  🌐 URL:         http://localhost:${String(config.PORT).padEnd(11)}║
  ║  🔧 Environment: ${config.NODE_ENV.padEnd(25)}║
  ║  📡 Status:      Online & Ready              ║
  ║                                              ║
  ╠══════════════════════════════════════════════╣
  ║  API Endpoints:                              ║
  ║  ├─ GET  /api/test      → Test connection    ║
  ║  ├─ GET  /api/health    → Health check       ║
  ║  ├─ POST /api/auth/*    → Authentication     ║
  ║  ├─ GET  /api/posts/*   → Posts              ║
  ║  └─ GET  /api/users/*   → Users              ║
  ╚══════════════════════════════════════════════╝
      `);
    });

    // ── Graceful Shutdown Handlers ──
    const shutdown = async (signal) => {
      console.log(`\n  🛑 ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('  👋 Server closed. Goodbye!\n');
        process.exit(0);
      });

      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        console.error('  ⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error(`\n  ❌ Unhandled Rejection: ${err.message}`);
      server.close(async () => {
        await disconnectDB();
        process.exit(1);
      });
    });

  } catch (error) {
    console.error(`\n  ❌ Failed to start server: ${error.message}\n`);
    process.exit(1);
  }
};

// Boot the application
startServer();
