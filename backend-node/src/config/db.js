// src/config/db.js
// Establishes and manages the MongoDB connection via Mongoose.
// Retries connection up to MAX_RETRIES before giving up, so the server
// stays alive for non-DB routes (health check, etc.) during transient outages.

import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error('[DB] MONGO_URI is not defined in .env – aborting startup.');
    process.exit(1);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      console.log(`[DB] MongoDB connected → ${conn.connection.host}`);
      break; // success — exit the retry loop
    } catch (err) {
      console.error(`[DB] Connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

      if (attempt < MAX_RETRIES) {
        console.log(`[DB] Retrying in ${RETRY_DELAY_MS / 1000}s…`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error('[DB] All connection attempts exhausted. Server will start WITHOUT a database connection.');
        console.error('[DB] API routes that require MongoDB will return 503 errors.');
        console.error('[DB] Fix your MONGO_URI in .env and restart the server.');
      }
    }
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