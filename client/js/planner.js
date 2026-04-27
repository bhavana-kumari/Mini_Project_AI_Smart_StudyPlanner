function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function getPlanDate() {
  const t = document.getElementById("timetable-date");
  if (t && t.value) return t.value;
  return window.localDateYMD();
}

function renderSmartSchedule(data) {
  const rows = Array.isArray(data.schedule) ? data.schedule : [];
  if (!rows.length) {
    return (
      '<div class="planner-empty card-elevated">' +
      "<p>No schedulable tasks found.</p>" +
      '<p class="muted small">Add timetable items with subject/task details, then generate again.</p>' +
      "</div>"
    );
  }

  let html = '<div class="card-elevated planner-table-wrap">';
  html += '<table class="planner-table">';
  html += "<thead><tr><th>Time</th><th>Subject</th><th>Topic</th><th>Subtopic</th></tr></thead><tbody>";
  rows.forEach((row) => {
    html += "<tr>";
    html += `<td>${escapeHtml(row.time)}</td>`;
    html += `<td>${escapeHtml(row.subject)}</td>`;
    html += `<td>${escapeHtml(row.topic)}</td>`;
    html += `<td>${escapeHtml(row.subtopic)}</td>`;
    html += "</tr>";
  });
  html += "</tbody></table></div>";
  return html;
}

document.addEventListener("DOMContentLoaded", () => {
  const out = document.getElementById("planner-output");
  const msg = document.getElementById("planner-msg");
  const btnSmart = document.getElementById("btn-generate-smart-schedule");

  if (!out || !btnSmart) return;

  async function loadTasksForPlanner() {
    const date = getPlanDate();
    const res = await fetch(
      window.apiBase + "/timetable?date=" + encodeURIComponent(date),
      { headers: window.authHeaders(false) }
    );
    const data = await window.readJson(res);
    if (!res.ok) throw new Error(data.message || "Failed to load tasks");

    return data.map((item) => ({
      subject: item.name,
      topic: item.task || item.name,
      task: item.task || "",
      difficulty: item.difficulty || "medium",
      deadline: item.date || null,
    }));
  }

  async function runSmartSchedule() {
    msg.textContent = "Generating smart schedule...";
    out.innerHTML = "";
    try {
      const tasks = await loadTasksForPlanner();
      if (!tasks.length) throw new Error("No timetable tasks available for this date.");

      const res = await fetch(window.apiBase + "/ai-schedule", {
        method: "POST",
        headers: window.authHeaders(true),
        body: JSON.stringify(tasks),
      });
      const data = await window.readJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to generate schedule");

      out.innerHTML = renderSmartSchedule(data);
      const label = data.source === "ai+rules" ? "AI + rules" : "rule-based fallback";
      msg.textContent = `Smart schedule ready (${label}).`;
    } catch (e) {
      msg.textContent = e.message;
    }
  }

  btnSmart.addEventListener("click", runSmartSchedule);
});
