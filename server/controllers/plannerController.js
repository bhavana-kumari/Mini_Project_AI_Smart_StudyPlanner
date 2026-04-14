const Timetable = require("../models/Timetable");

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function difficultyWeight(d) {
  if (d === "hard") return 3;
  if (d === "medium") return 2;
  return 1;
}

/** Merge rows by subject name; keep highest difficulty. */
function uniqueSubjects(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = (r.name || "").trim().toLowerCase();
    if (!key) continue;
    const prev = map.get(key);
    if (!prev || difficultyWeight(r.difficulty) > difficultyWeight(prev.difficulty)) {
      map.set(key, { name: r.name.trim(), difficulty: r.difficulty || "medium" });
    }
  }
  return [...map.values()].sort((a, b) => difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * OPTION 1 — Today only: rows where `date` matches the requested calendar day (strict).
 */
async function generateToday(req, res) {
  try {
    let { date } = req.query;
    if (!date || typeof date !== "string") {
      return res.status(400).json({ message: "Query ?date=YYYY-MM-DD is required" });
    }

    const rows = await Timetable.find({ userId: req.userId, date }).sort({ start: 1 }).lean();

    const slots = rows.map((r) => ({
      start: r.start,
      end: r.end,
      name: r.name,
      difficulty: r.difficulty,
      task: r.task || "",
    }));

    res.json({
      kind: "today",
      date,
      slots,
    });
  } catch (err) {
    console.error("generateToday:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/**
 * OPTION 2 — Weekly AI-style plan: Mon–Sun, distribute unique subjects by difficulty across days and time slots.
 */
async function generateWeekly(req, res) {
  try {
    const rows = await Timetable.find({ userId: req.userId }).lean();
    const subjects = uniqueSubjects(rows);

    if (!subjects.length) {
      return res.json({
        kind: "weekly",
        generatedAt: new Date().toISOString(),
        days: WEEK_DAYS.map((day) => ({ day, blocks: [] })),
        message: "Add subjects to your timetable to generate a balanced week.",
      });
    }

    const n = subjects.length;
    const days = WEEK_DAYS.map((dayName, dayIndex) => {
      const isWeekend = dayIndex >= 5;
      const numBlocks = isWeekend ? 2 : 3;
      const blocks = [];
      const baseHour = isWeekend ? 10 : 9;

      for (let s = 0; s < numBlocks; s++) {
        const subj = subjects[(dayIndex * 2 + s * 3) % n];
        const h = baseHour + s * 2;
        const start = `${pad2(h)}:00`;
        const end = `${pad2(h + 1)}:00`;
        blocks.push({
          start,
          end,
          name: subj.name,
          difficulty: subj.difficulty,
          note:
            subj.difficulty === "hard"
              ? "Deep focus — tackle while fresh."
              : subj.difficulty === "medium"
                ? "Steady practice block."
                : "Light review or warm-up.",
        });
      }
      return { day: dayName, blocks };
    });

    res.json({
      kind: "weekly",
      generatedAt: new Date().toISOString(),
      days,
    });
  } catch (err) {
    console.error("generateWeekly:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { generateToday, generateWeekly };
