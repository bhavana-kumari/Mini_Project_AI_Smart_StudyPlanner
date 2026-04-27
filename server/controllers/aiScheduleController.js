const Timetable = require("../models/Timetable");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function daysUntilDeadline(deadline) {
  if (!deadline) return null;
  const today = new Date();
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function normalizeDifficulty(value) {
  const v = String(value || "medium").toLowerCase();
  if (v === "hard") return "hard";
  if (v === "easy") return "easy";
  return "medium";
}

function splitTopicFallback(topic) {
  const t = String(topic || "").trim();
  if (!t) return ["Core concepts", "Practice questions"];
  return [`Introduction to ${t}`, `${t} worked examples`, `${t} revision`];
}

function sanitizeAiJson(content) {
  const cleaned = String(content || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned);
}

function buildRuleQueue(rawTasks) {
  const tasks = rawTasks
    .map((task, index) => {
      const difficulty = normalizeDifficulty(task.difficulty);
      const deadlineGap = daysUntilDeadline(task.deadline);
      const score = task.score == null ? null : Number(task.score);
      let priority = 0;

      if (difficulty === "hard") priority += 3;
      else if (difficulty === "medium") priority += 2;
      else priority += 1;

      if (deadlineGap != null) {
        if (deadlineGap <= 1) priority += 4;
        else if (deadlineGap <= 3) priority += 2;
      }

      if (Number.isFinite(score) && score < 50) priority += 3;
      else if (Number.isFinite(score) && score < 70) priority += 1;

      const durationMinutes =
        difficulty === "hard" ? 90 : difficulty === "easy" ? 45 : 60;

      return {
        id: `${String(task.subject || "").toLowerCase()}::${String(task.topic || "").toLowerCase()}::${index}`,
        subject: String(task.subject || "").trim(),
        topic: String(task.topic || task.task || "").trim(),
        difficulty,
        deadline: task.deadline || null,
        score: Number.isFinite(score) ? score : null,
        priority,
        durationMinutes,
        deadlineGap,
      };
    })
    .filter((t) => t.subject && t.topic);

  tasks.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.subject.localeCompare(b.subject);
  });

  // Near deadlines get earlier slots naturally by queue order.
  let currentTime = 8 * 60; // 08:00
  return tasks.map((task) => {
    const start = toHHMM(currentTime);
    const end = toHHMM(currentTime + task.durationMinutes);
    currentTime += task.durationMinutes + 15; // include buffer break
    return { ...task, timeSlot: `${start} - ${end}` };
  });
}

async function fetchAiSubtopics(ruleQueue) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing");

  const topicsPrompt = ruleQueue
    .map(
      (t) =>
        `- ${t.subject}: ${t.topic} (difficulty: ${t.difficulty}, deadlineDays: ${t.deadlineGap ?? "n/a"}, score: ${t.score ?? "n/a"})`
    )
    .join("\n");

  const prompt = [
    "Generate a structured study plan for the following topics.",
    "Break each topic into subtopics and assign focused study direction.",
    "",
    "Topics:",
    topicsPrompt,
    "",
    "Return ONLY valid JSON as an array (no markdown, no explanation).",
    "Each array item must match:",
    '{ "subject": "DSA", "topic": "Trees", "subtopics": ["BST", "DFS", "BFS", "Traversal"] }',
  ].join("\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `Return as: {"plan":[...]}.\n${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI request failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const parsed = sanitizeAiJson(content);
  const plan = Array.isArray(parsed) ? parsed : parsed.plan;
  if (!Array.isArray(plan)) throw new Error("AI returned invalid JSON structure");
  return plan;
}

async function generateSchedule(req, res) {
  try {
    let tasks = Array.isArray(req.body) ? req.body : req.body?.tasks;

    // If frontend sends nothing, derive tasks from saved timetable rows.
    if (!Array.isArray(tasks) || tasks.length === 0) {
      const rows = await Timetable.find({ userId: req.userId }).sort({ date: 1, start: 1 }).lean();
      tasks = rows.map((row) => ({
        subject: row.name,
        topic: row.task || row.name,
        difficulty: row.difficulty || "medium",
        deadline: row.date || null,
      }));
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ schedule: [], source: "rules", message: "No tasks provided" });
    }

    const ruleQueue = buildRuleQueue(tasks);
    if (!ruleQueue.length) {
      return res.status(400).json({ schedule: [], source: "rules", message: "Tasks are missing subject/topic" });
    }

    let aiPlan = [];
    let source = "rules";

    try {
      aiPlan = await fetchAiSubtopics(ruleQueue);
      source = "ai+rules";
    } catch (error) {
      console.warn("AI schedule fallback:", error.message);
    }

    const aiMap = new Map();
    aiPlan.forEach((item) => {
      const key = `${String(item.subject || "").toLowerCase()}::${String(item.topic || "").toLowerCase()}`;
      const subs = Array.isArray(item.subtopics) ? item.subtopics.filter(Boolean) : [];
      aiMap.set(key, subs);
    });

    const schedule = [];
    for (const task of ruleQueue) {
      const key = `${task.subject.toLowerCase()}::${task.topic.toLowerCase()}`;
      const subtopics = aiMap.get(key)?.length ? aiMap.get(key) : splitTopicFallback(task.topic);
      for (const subtopic of subtopics) {
        schedule.push({
          time: task.timeSlot,
          subject: task.subject,
          topic: task.topic,
          subtopic: String(subtopic),
          priority: task.priority,
        });
      }
    }

    return res.json({
      source,
      generatedAt: new Date().toISOString(),
      schedule,
    });
  } catch (err) {
    console.error("generateSchedule:", err);
    return res.status(500).json({
      source: "rules",
      schedule: [],
      message: "Could not generate smart schedule",
    });
  }
}

module.exports = { generateSchedule };
