const Timetable = require("../models/Timetable");

async function list(req, res) {
  try {
    const { date } = req.query;
    const q = { userId: req.userId };
    // Filter by day: exact date, or legacy rows with no date (show on any day)
    if (date) {
      q.$or = [{ date }, { date: null }, { date: { $exists: false } }];
    }
    const items = await Timetable.find(q).sort({ start: 1 });
    res.json(items);
  } catch (err) {
    console.error("timetable list:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function create(req, res) {
  try {
    const { name, difficulty, start, end, task, date } = req.body;
    if (!name || !start || !end) {
      return res.status(400).json({ message: "name, start, and end are required" });
    }
    const row = await Timetable.create({
      userId: req.userId,
      name: name.trim(),
      difficulty: difficulty || "medium",
      start,
      end,
      task: task || "",
      date: date || null,
      completed: false,
      completedAt: null,
    });
    res.status(201).json(row);
  } catch (err) {
    console.error("timetable create:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, difficulty, start, end, task, completed } = req.body;
    const row = await Timetable.findOne({ _id: id, userId: req.userId });
    if (!row) return res.status(404).json({ message: "Not found" });

    if (name !== undefined) row.name = name.trim();
    if (difficulty !== undefined) row.difficulty = difficulty;
    if (start !== undefined) row.start = start;
    if (end !== undefined) row.end = end;
    if (task !== undefined) row.task = task;

    if (completed !== undefined) {
      row.completed = Boolean(completed);
      row.completedAt = row.completed ? new Date() : null;
    }

    await row.save();
    res.json(row);
  } catch (err) {
    console.error("timetable update:", err);
    res.status(500).json({ message: "Server error" });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await Timetable.findOneAndDelete({ _id: id, userId: req.userId });
    if (!result) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("timetable remove:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/** Toggle completed flag and completedAt for checklist UI */
async function toggleComplete(req, res) {
  try {
    const { id } = req.params;
    const row = await Timetable.findOne({ _id: id, userId: req.userId });
    if (!row) return res.status(404).json({ message: "Not found" });
    row.completed = !row.completed;
    row.completedAt = row.completed ? new Date() : null;
    await row.save();
    res.json(row);
  } catch (err) {
    console.error("timetable toggle:", err);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { list, create, update, remove, toggleComplete };
