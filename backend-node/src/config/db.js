// src/config/db.js
// Establishes and manages the MongoDB connection via Mongoose.

import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('[DB] MONGO_URI is not defined in .env – aborting startup.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 8 has good defaults; these are explicit for hackathon clarity
      serverSelectionTimeoutMS: 5000, // fail fast if Atlas is unreachable
      socketTimeoutMS: 45000,
    });

    console.log(`[DB] MongoDB connected → ${conn.connection.host}`);
  } catch (err) {
    console.error(`[DB] Connection failed: ${err.message}`);
    process.exit(1); // crash loud – better to know early in a 24-hr hack
  }

  // Useful lifecycle logs during demo
  mongoose.connection.on('disconnected', () =>
    console.warn('[DB] MongoDB disconnected – attempting reconnect…')
  );
  mongoose.connection.on('reconnected', () =>
    console.log('[DB] MongoDB reconnected.')
  );
};

export default connectDB;