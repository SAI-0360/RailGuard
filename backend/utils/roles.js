// backend/utils/roles.js
// Single source of truth for the RailGuard role hierarchy.
//
// Railway maintenance chain of command:
//   den — District Engineer (network-wide authority, oversight)
//   sse — Senior Section Engineer (operations admin, verifies repairs)
//   je  — Junior Engineer (field worker, acts on work orders)
//
// Legacy roles "admin" and "worker" are kept as aliases for backward
// compatibility: existing accounts, JWTs, and seeds keep working.
//   admin  → sse
//   worker → je

const CANONICAL_ROLES = ["den", "sse", "je"];

const ROLE_ALIASES = {
  admin: "sse",
  worker: "je",
};

/**
 * Resolve any role string (canonical or legacy alias) to its canonical form.
 * Unknown values pass through unchanged so guards can reject them.
 * @param {string} role
 * @returns {string} canonical role
 */
function normalizeRole(role) {
  return ROLE_ALIASES[role] || role;
}

// Authorization groups, expressed in canonical roles.
const SENIOR_ROLES = ["den", "sse"]; // what "admin" used to gate
const FIELD_ROLES = ["je"];          // what "worker" used to gate

module.exports = {
  CANONICAL_ROLES,
  ROLE_ALIASES,
  normalizeRole,
  SENIOR_ROLES,
  FIELD_ROLES,
};
