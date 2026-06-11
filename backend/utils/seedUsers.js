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
 * Seed demo users if the collection is empty. Never throws — a seeding
 * failure must not take the demo server down.
 */
async function seedUsers() {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      console.log(`User seed skipped: ${count} user(s) already present`);
      return;
    }
    // create() (not insertMany) so the bcrypt pre-save hook runs per user
    await User.create(SEED_USERS);
    console.log(`Seeded ${SEED_USERS.length} demo users (1 admin, 3 workers)`);
  } catch (err) {
    console.error(`User seeding failed: ${err.message}`);
  }
}

module.exports = seedUsers;
