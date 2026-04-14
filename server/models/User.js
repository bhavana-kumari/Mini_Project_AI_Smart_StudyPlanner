const mongoose = require("mongoose");

/**
 * User model — supports email/password (bcrypt) and optional Google account link.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Optional when user signs in only with Google
      default: null,
    },
    googleId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
