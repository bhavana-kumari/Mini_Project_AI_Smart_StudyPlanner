require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const timeRoutes = require("./routes/timeRoutes");
const aiScheduleRoutes = require("./routes/aiScheduleRoutes");

//const plannerRoutes = require("./routes/plannerRoutes");

if (!process.env.JWT_SECRET) {
  console.warn("Warning: JWT_SECRET is not set. Set it in .env for production.");
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// REST API
app.use("/api/auth", authRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/time", timeRoutes);
app.use("/api/ai-schedule", aiScheduleRoutes);

//app.use("/api/planner", plannerRoutes);

// Single-page client (HTML/CSS/vanilla JS)
const clientDir = path.join(__dirname, "..", "client");
app.use(express.static(clientDir));

// SPA fallback: serve index.html for non-API routes
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDir, "index.html"));
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
