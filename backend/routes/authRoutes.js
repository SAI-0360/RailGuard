// backend/routes/authRoutes.js
// POST /api/auth/login — email + password → JWT + user profile
// GET  /api/auth/me    — current user from token (protected)

const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../models/User");
const { isDBConnected } = require("../config/db");
const { protect, getJwtSecret } = require("../middleware/auth");

/** Public user shape — never includes the password hash. */
function publicUser(user) {
  return {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    assignedSegments: user.assignedSegments || [],
  };
}

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({ error: "email and password are required" });
    }

    if (!isDBConnected()) {
      return res.status(503).json({ error: "Auth database unavailable. Check MONGODB_URI and MongoDB status." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.matchPassword(password))) {
      // Same message for both cases: do not leak which emails exist
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const profile = publicUser(user);
    const token = jwt.sign(profile, getJwtSecret(), {
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    });

    res.json({ token, user: profile });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me — validate token, return the current user.
// Explicitly includes `role` (den | sse | je, or legacy admin/worker) so the
// frontend can route by role. assignedSegments scopes JE field workers.
router.get("/me", protect, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      assignedSegments: req.user.assignedSegments || [],
    },
  });
});

module.exports = router;
