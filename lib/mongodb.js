/**
 * lib/mongodb.js
 *
 * WHY THIS FILE EXISTS:
 * In Next.js, every API route is a separate serverless function.
 * Without caching, each request would open a brand-new MongoDB connection —
 * which is slow and exhausts your free-tier connection limit fast.
 *
 * This file stores the connection in a global variable so it's reused
 * across hot-reloads in dev and across requests in production.
 *
 * WHEN TO USE: Import { connectDB } into every API route before querying.
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "❌ Please define the MONGODB_URI environment variable in .env.local"
  );
}

// global.mongooseCache persists across Next.js hot-reloads in development
let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
  // If a connection already exists, reuse it
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection is being established, wait for it
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Don't buffer commands if disconnected
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("✅ MongoDB connected");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset so next attempt can retry
    throw e;
  }

  return cached.conn;
}
