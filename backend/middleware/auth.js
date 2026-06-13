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
const { normalizeRole, SENIOR_ROLES } = require("../utils/roles");

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

/**
 * Build a role guard. Roles are normalized first, so legacy "admin"/"worker"
 * tokens are honored (admin→sse, worker→je). Mount after protect.
 * @param {string[]} allowed - canonical roles permitted
 * @param {string} label - human label for the 403 message
 */
function requireRoles(allowed, label) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: "Not authorized" });
    }
    const role = normalizeRole(req.user.role);
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: `${label} role required` });
    }
    next();
  };
}

// Senior staff (DEN or SSE). Replaces the old "admin" gate; an "admin" token
// normalizes to "sse" and still passes, preserving backward compatibility.
const adminOnly = requireRoles(SENIOR_ROLES, "Senior (DEN/SSE)");

// SSE only — repair verification is the Senior Section Engineer's sign-off.
// DEN and JE are intentionally excluded.
const sseOnly = requireRoles(["sse"], "SSE");

// JE only — field work (acknowledging and progressing work orders).
const jeOnly = requireRoles(["je"], "JE");

// DEN only — the Division Engineer's tier of the escalation hierarchy. Only the
// DEN may answer an escalation the SSE raised; JE and SSE are excluded.
const denOnly = requireRoles(["den"], "DEN");

module.exports = { protect, adminOnly, sseOnly, jeOnly, denOnly, requireRoles, getJwtSecret };
