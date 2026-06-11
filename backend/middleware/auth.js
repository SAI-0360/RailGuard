// backend/middleware/auth.js
// protect — verifies the Bearer JWT and attaches req.user.
// adminOnly — role guard, mount after protect.
//
// The JWT payload carries { id, name, email, role, assignedSegments }, so
// verification works even if MongoDB drops mid-demo (CONTEXT.md resilience
// rule). When the DB is reachable we refresh req.user from the database so
// role/assignment changes take effect without re-login.

const jwt = require("jsonwebtoken");
const { isDBConnected } = require("../config/db");

const DEV_FALLBACK_SECRET = "railguard-dev-secret-change-me";

function getJwtSecret() {
  return process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
}

/** Verify JWT from the Authorization header and attach req.user. */
async function protect(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authorized: no token provided" });
  }

  const token = header.slice(7);

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (err) {
    return res.status(401).json({ error: "Not authorized: invalid or expired token" });
  }

  // Token payload is the resilient baseline identity
  req.user = {
    id: decoded.id,
    name: decoded.name,
    email: decoded.email,
    role: decoded.role,
    assignedSegments: decoded.assignedSegments || [],
  };

  // Best-effort refresh from DB when available
  if (isDBConnected()) {
    try {
      const User = require("../models/User");
      const dbUser = await User.findById(decoded.id).select("-password");
      if (dbUser) {
        req.user = {
          id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          assignedSegments: dbUser.assignedSegments,
        };
      }
    } catch (err) {
      // Keep the token-derived identity; do not fail the request
    }
  }

  next();
}

/** Role guard: only admins pass. Mount after protect. */
function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authorized" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin role required" });
  }
  next();
}

module.exports = { protect, adminOnly, getJwtSecret };
