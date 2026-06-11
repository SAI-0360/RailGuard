// backend/config/db.js
// Mongoose connection. Called from server.js before routes are mounted.
//
// Resilience rule (CONTEXT.md: "Fallbacks are mandatory — the app never crashes"):
// a failed connection logs loudly but does NOT kill the server. The segment
// demo flow is in-memory and must survive a missing/unreachable MongoDB;
// only login (which needs the users collection) degrades.

const mongoose = require("mongoose");

const DEFAULT_URI = "mongodb://127.0.0.1:27017/railguard";

/**
 * Connect to MongoDB via Mongoose.
 * @returns {Promise<boolean>} true if connected, false if connection failed
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;

  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return true;
  } catch (err) {
    console.error(`MongoDB connection FAILED: ${err.message}`);
    console.error("Auth login will be unavailable until MongoDB is reachable. Demo routes still run.");
    return false;
  }
}

/** Whether mongoose currently has a live connection. */
function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isDBConnected };
