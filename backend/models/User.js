// backend/models/User.js
// RailGuard operator account. DEN/SSE (senior) control the whole network and
// the simulator; JE field workers are scoped to their assignedSegments.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { CANONICAL_ROLES, normalizeRole } = require("../utils/roles");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      // Canonical roles only. Legacy "admin"/"worker" are normalized to
      // "sse"/"je" by the setter below before validation, so passing a legacy
      // role still stores a valid canonical value.
      enum: CANONICAL_ROLES,
      default: "je",
      set: normalizeRole,
    },
    // Segment IDs this JE is responsible for ("SEG-001" ... "SEG-100").
    // Empty for DEN/SSE (senior staff see everything).
    assignedSegments: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Hash password before save (only when modified), salt rounds 10.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Compare an entered plaintext password against the stored hash.
 * @param {string} entered
 * @returns {Promise<boolean>}
 */
userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
