const mongoose = require('mongoose');

// ══════════════════════════════════════════════════════
// MongoDB Connection Module
// ══════════════════════════════════════════════════════
// Handles database connection with retry logic,
// event listeners, and graceful shutdown support.
// ══════════════════════════════════════════════════════

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Connect to MongoDB with automatic retry logic.
 * Resolves when connection is established, rejects after max retries.
 */
const connectDB = async () => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        // Mongoose 7+ uses these defaults, but being explicit for clarity
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      // ── Connection Event Listeners ──
      mongoose.connection.on('error', (err) => {
        console.error(`\n  ❌ MongoDB Runtime Error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('\n  ⚠️  MongoDB Disconnected. Attempting reconnection...');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('\n  🔄 MongoDB Reconnected Successfully');
      });

      // ── Success Log ──
      console.log(`
  ┌──────────────────────────────────────────┐
  │         📦 DATABASE CONNECTION           │
  ├──────────────────────────────────────────┤
  │  ✅ Status:   Connected                  │
  │  🏠 Host:     ${conn.connection.host.padEnd(25)}│
  │  🗄️  Database: ${conn.connection.name.padEnd(25)}│
  │  🔌 Port:     ${String(conn.connection.port).padEnd(25)}│
  └──────────────────────────────────────────┘`);

      return conn;
    } catch (error) {
      retries++;
      console.error(`\n  ❌ MongoDB Connection Attempt ${retries}/${MAX_RETRIES} Failed`);
      console.error(`     Error: ${error.message}`);

      if (retries >= MAX_RETRIES) {
        console.error(`\n  🚫 Max retries (${MAX_RETRIES}) reached. Could not connect to MongoDB.`);
        console.error('     Please verify:');
        console.error('     1. MongoDB is running (mongod / MongoDB Compass)');
        console.error('     2. MONGO_URI in .env is correct');
        console.error(`     3. Current URI: ${process.env.MONGO_URI}\n`);
        process.exit(1);
      }

      console.log(`     ⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...\n`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

/**
 * Gracefully close the MongoDB connection.
 * Called during process shutdown signals.
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('\n  🔒 MongoDB Connection Closed Gracefully');
  } catch (error) {
    console.error(`\n  ❌ Error Closing MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB, disconnectDB };
