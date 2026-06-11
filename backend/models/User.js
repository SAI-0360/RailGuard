// backend/models/User.js
// RailGuard operator account. Admins control the whole network and the
// simulator; workers are scoped to their assignedSegments.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
      enum: ["admin", "worker"],
      default: "worker",
    },
    // Segment IDs this worker is responsible for ("SEG-001" ... "SEG-100").
    // Empty for admins (admins see everything).
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
