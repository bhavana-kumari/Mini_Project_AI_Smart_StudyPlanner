const Time = require("../models/Time");
const Timetable = require("../models/Timetable");

/** Parse YYYY-MM-DD into local midnight bounds (server runs in user-agnostic way; client sends local calendar date). */
function dayBoundsFromString(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
}

/** Monday 00:00 of the week containing the given calendar date (local). */
function mondayOfWeekContaining(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const dow = day.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(y, m - 1, d + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** Add days to a Date (local). */
function addDays(date, n) {
  const x = new Date(date.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function toYMD(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Add minutes to a daily log (Pomodoro); `date` should be YYYY-MM-DD from the client. */
async function addMinutes(req, res) {
  try {
    const { studyMinutes = 0, breakMinutes = 0, date } = req.body;
    if (!date || typeof date !== "string") {
      return res.status(400).json({ message: "date (YYYY-MM-DD) is required" });
    }
    const day = date;
    const s = Number(studyMinutes) || 0;
    const b = Number(breakMinutes) || 0;
    if (s < 0 || b < 0) {
      return res.status(400).json({ message: "Minutes must be non-negative" });
    }
    const doc = await Time.findOneAndUpdate(
      { userId: req.userId, date: day },
      {
        $inc: { studyMinutes: s, breakMinutes: b },
        $setOnInsert: { userId: req.userId, date: day },
      },
      { new: true, upsert: true }
    );
    res.json(doc);
  } catch (err) {
    console.error("addMinutes:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/**
 * Mon → Sun for the week that contains `date` (query param).
 * Returns study minutes per day for the chart.
 */
async function weeklyStudy(req, res) {
  try {
    let { date: ref } = req.query;
    if (!ref || typeof ref !== "string") {
      ref = toYMD(new Date());
    }
    const monday = mondayOfWeekContaining(ref);
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(toYMD(addDays(monday, i)));
    }
    const rows = await Time.find({
      userId: req.userId,
      date: { $in: dates },
    }).lean();
    const map = Object.fromEntries(rows.map((r) => [r.date, r.studyMinutes || 0]));
    const values = dates.map((ds) => map[ds] || 0);
    res.json({ labels, values, dates });
  } catch (err) {
    console.error("weeklyStudy:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function countTasksCompletedOnDay(userId, dateStr) {
  const { start, end } = dayBoundsFromString(dateStr);
  return Timetable.countDocuments({
    userId,
    completed: true,
    completedAt: { $gte: start, $lte: end },
  });
}

/** Streak: consecutive days with a completed task (same as before). */
async function computeStreak(userId) {
  const completions = await Timetable.find({
    userId,
    completed: true,
    completedAt: { $ne: null },
  })
    .select("completedAt")
    .lean();

  const daysSet = new Set();
  for (const c of completions) {
    if (c.completedAt) {
      daysSet.add(toYMD(new Date(c.completedAt)));
    }
  }

  const cursor = new Date();
  if (!daysSet.has(toYMD(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 4000; i++) {
    const key = toYMD(cursor);
    if (daysSet.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Day-wise progress + weekly series in one call.
 * Query: ?date=YYYY-MM-DD (client’s “today”)
 */
async function progressSummary(req, res) {
  try {
    let { date } = req.query;
    if (!date || typeof date !== "string") {
      date = toYMD(new Date());
    }

    const dayDoc = await Time.findOne({ userId: req.userId, date }).lean();
    const todayStudyMinutes = dayDoc ? dayDoc.studyMinutes || 0 : 0;
    const todayBreakMinutes = dayDoc ? dayDoc.breakMinutes || 0 : 0;
    const tasksCompletedToday = await countTasksCompletedOnDay(req.userId, date);

    const monday = mondayOfWeekContaining(date);
    const weekDates = [];
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    for (let i = 0; i < 7; i++) {
      weekDates.push(toYMD(addDays(monday, i)));
    }
    const rows = await Time.find({
      userId: req.userId,
      date: { $in: weekDates },
    }).lean();
    const map = Object.fromEntries(rows.map((r) => [r.date, r.studyMinutes || 0]));
    const weekValues = weekDates.map((ds) => map[ds] || 0);

    const [yy, mm, dd] = date.split("-").map(Number);
    const wd = new Date(yy, mm - 1, dd).getDay();
    const currentDayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][wd];

    res.json({
      date,
      currentDayName,
      todayStudyMinutes,
      todayBreakMinutes,
      tasksCompletedToday,
      streak: await computeStreak(req.userId),
      week: {
        labels,
        values: weekValues,
        dates: weekDates,
      },
    });
  } catch (err) {
    console.error("progressSummary:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { addMinutes, weeklyStudy, progressSummary };
