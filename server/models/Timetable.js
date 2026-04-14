const mongoose = require("mongoose");

/**
 * Timetable entry — subjects/tasks per user with completion tracking.
 */
const timetableSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    start: { type: String, required: true },
    end: { type: String, required: true },
    task: { type: String, default: "" },
    /** YYYY-MM-DD — which calendar day this block belongs to (optional; used for filtering & “today” planner) */
    date: { type: String, default: null },
    completed: { type: Boolean, default: false },
    // Set when task is marked complete — used for streak / progress stats
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Timetable", timetableSchema);
