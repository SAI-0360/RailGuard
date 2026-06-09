// backend/middleware/errorHandler.js
// Global Express error handler — catches all runtime errors.

function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: err.message });
}

module.exports = errorHandler;
