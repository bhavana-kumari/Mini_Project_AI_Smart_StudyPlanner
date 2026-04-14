/**
 * AI Planner — “Today” (strict dated rows) vs weekly simulated AI (Mon–Sun).
 */

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

function renderToday(data) {
  const slots = data.slots || [];
  if (!slots.length) {
    return (
      '<div class="planner-empty card-elevated">' +
      "<p>No subjects for <strong>" +
      escapeHtml(data.date) +
      "</strong>.</p>" +
      "<p class=\"muted small\">Add entries in Timetable with this date, then generate again.</p>" +
      "</div>"
    );
  }
  let html = '<div class="planner-today card-elevated">';
  html += "<h3>Today — " + escapeHtml(data.date) + "</h3><ul class=\"planner-slot-list\">";
  slots.forEach((s) => {
    html +=
      "<li class=\"planner-slot-row\">" +
      "<span class=\"planner-time\">" +
      escapeHtml(s.start) +
      " – " +
      escapeHtml(s.end) +
      "</span>" +
      "<span class=\"planner-subj\">" +
      escapeHtml(s.name) +
      "</span>" +
      '<span class="badge ' +
      (s.difficulty === "hard" ? "hard" : s.difficulty === "easy" ? "easy" : "medium") +
      '">' +
      escapeHtml(s.difficulty) +
      "</span>";
    if (s.task) {
      html += '<p class="muted small">' + escapeHtml(s.task) + "</p>";
    }
    html += "</li>";
  });
  html += "</ul></div>";
  return html;
}

function renderWeekly(data) {
  const days = data.days || [];
  if (data.message && !days.some((d) => d.blocks && d.blocks.length)) {
    return '<div class="planner-empty card-elevated"><p class="muted">' + escapeHtml(data.message) + "</p></div>";
  }
  let html = '<div class="planner-week-grid">';
  days.forEach((dayInfo, i) => {
    const grad = "grad-" + (i % 4);
    html += '<div class="planner-day-box card-elevated ' + grad + '">';
    html += "<h4>" + escapeHtml(dayInfo.day) + "</h4>";
    (dayInfo.blocks || []).forEach((b) => {
      html +=
        '<div class="planner-block">' +
        "<p class=\"planner-block-time\">" +
        escapeHtml(b.start) +
        " – " +
        escapeHtml(b.end) +
        "</p>" +
        "<p class=\"planner-block-subj\">" +
        escapeHtml(b.name) +
        "</p>" +
        '<span class="badge ' +
        (b.difficulty === "hard" ? "hard" : b.difficulty === "easy" ? "easy" : "medium") +
        '">' +
        escapeHtml(b.difficulty) +
        "</span>";
      if (b.note) {
        html += '<p class="planner-note muted small">' + escapeHtml(b.note) + "</p>";
      }
      html += "</div>";
    });
    if (!(dayInfo.blocks && dayInfo.blocks.length)) {
      html += '<p class="muted small">—</p>';
    }
    html += "</div>";
  });
  html += "</div>";
  return html;
}

document.addEventListener("DOMContentLoaded", () => {
  const out = document.getElementById("planner-output");
  const msg = document.getElementById("planner-msg");
  const btnToday = document.getElementById("btn-plan-today");
  const btnWeek = document.getElementById("btn-plan-weekly");

  if (!out) return;

  async function runToday() {
    msg.textContent = "Building today’s plan…";
    out.innerHTML = "";
    const date = getPlanDate();
    try {
      const res = await fetch(
        window.apiBase + "/planner/today?date=" + encodeURIComponent(date),
        { headers: window.authHeaders(false) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      out.innerHTML = renderToday(data);
      msg.textContent = "Showing slots for " + date + ".";
    } catch (e) {
      msg.textContent = e.message;
    }
  }

  async function runWeekly() {
    msg.textContent = "Generating weekly AI plan…";
    out.innerHTML = "";
    try {
      const res = await fetch(window.apiBase + "/planner/weekly", {
        headers: window.authHeaders(false),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      out.innerHTML = renderWeekly(data);
      msg.textContent = data.generatedAt
        ? "Updated " + new Date(data.generatedAt).toLocaleString()
        : "Weekly plan ready.";
    } catch (e) {
      msg.textContent = e.message;
    }
  }

  if (btnToday) btnToday.addEventListener("click", runToday);
  if (btnWeek) btnWeek.addEventListener("click", runWeekly);
});
