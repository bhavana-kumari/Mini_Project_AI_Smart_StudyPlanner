const mongoose = require("mongoose");

/**
 * Daily time log — Pomodoro study/break minutes aggregated per calendar day (UTC date string).
 */
const timeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Format: YYYY-MM-DD (consistent for charts and queries) */
    date: { type: String, required: true },
    studyMinutes: { type: Number, default: 0, min: 0 },
    breakMinutes: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

timeSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Time", timeSchema);
