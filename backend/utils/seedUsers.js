// backend/utils/seedUsers.js
// Seeds the demo operator accounts on boot when the users collection is empty.
// Passwords run through the User model's bcrypt pre-save hook.

const User = require("../models/User");
const { SEGMENT_ID_PREFIX } = require("./constants");

/** Build ["SEG-001", ..., "SEG-NNN"] for an inclusive 1-based range. */
function segmentRange(from, to) {
  const ids = [];
  for (let i = from; i <= to; i++) {
    ids.push(`${SEGMENT_ID_PREFIX}${String(i).padStart(3, "0")}`);
  }
  return ids;
}

const SEED_USERS = [
  // --- Current role hierarchy: DEN > SSE > JE ---
  {
    name: "Sr. DEN Sharma",
    email: "den@railguard.in",
    password: "den123",
    role: "den",
    assignedSegments: [],
  },
  {
    name: "SSE Krishnan",
    email: "sse@railguard.in",
    password: "sse123",
    role: "sse",
    assignedSegments: [],
  },
  {
    name: "JE Track Worker 1",
    email: "je1@railguard.in",
    password: "je1123",
    role: "je",
    assignedSegments: segmentRange(1, 33),
  },
  {
    name: "JE Track Worker 2",
    email: "je2@railguard.in",
    password: "je2123",
    role: "je",
    assignedSegments: segmentRange(34, 66),
  },
  {
    name: "JE Track Worker 3",
    email: "je3@railguard.in",
    password: "je3123",
    role: "je",
    assignedSegments: segmentRange(67, 100),
  },

  // --- Legacy accounts, kept for backward compatibility. Their "admin"/
  // "worker" roles are normalized to "sse"/"je" by the User model setter. ---
  {
    name: "Operations Admin",
    email: "admin@railguard.com",
    password: "admin123",
    role: "admin",
    assignedSegments: [],
  },
  {
    name: "Track Worker 1",
    email: "worker1@railguard.com",
    password: "worker123",
    role: "worker",
    assignedSegments: segmentRange(1, 33),
  },
  {
    name: "Track Worker 2",
    email: "worker2@railguard.com",
    password: "worker123",
    role: "worker",
    assignedSegments: segmentRange(34, 66),
  },
  {
    name: "Track Worker 3",
    email: "worker3@railguard.com",
    password: "worker123",
    role: "worker",
    assignedSegments: segmentRange(67, 100),
  },
];

/**
 * Seed demo users idempotently: create any account whose email is missing,
 * leave existing accounts untouched. This lets new roles (den/sse/je) be
 * added to a database that already holds the legacy accounts. Never throws —
 * a seeding failure must not take the demo server down.
 */
async function seedUsers() {
  try {
    let created = 0;
    for (const u of SEED_USERS) {
      const exists = await User.findOne({ email: u.email });
      if (exists) continue;
      // create() (not insertMany) so the bcrypt pre-save hook + role setter run
      await User.create(u);
      created++;
    }
    if (created > 0) {
      console.log(`Seeded ${created} new user(s); ${SEED_USERS.length - created} already present`);
    } else {
      console.log(`User seed: all ${SEED_USERS.length} accounts already present`);
    }
  } catch (err) {
    console.error(`User seeding failed: ${err.message}`);
  }
}

module.exports = seedUsers;
