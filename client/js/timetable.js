/**
 * Timetable: add (with date), delete, mark complete — no inline edit.
 */

const TIMETABLE_API = window.apiBase + "/timetable";

function badgeClass(d) {
  if (d === "hard") return "badge hard";
  if (d === "easy") return "badge easy";
  return "badge medium";
}

function cardHtml(item) {
  const done = item.completed;
  const wrapCls = done ? "tt-card done" : "tt-card";
  const strike = done ? " tt-strike" : "";
  const tick = done ? '<span class="tt-done-tick" aria-hidden="true">✔</span>' : "";
  const strongCls = done ? ' class="tt-strike"' : "";

  return (
    '<article class="' +
    wrapCls +
    '" data-id="' +
    item._id +
    '">' +
    '<div class="tt-body">' +
    '<div class="tt-head">' +
    tick +
    "<strong" +
    strongCls +
    ">" +
    escapeHtml(item.name) +
    "</strong>" +
    ' <span class="' +
    badgeClass(item.difficulty) +
    '">' +
    item.difficulty +
    "</span></div>" +
    '<p class="tt-row' +
    strike +
    '"><span class="tt-meta-label">Time</span> ' +
    escapeHtml(item.start) +
    " – " +
    escapeHtml(item.end) +
    (item.date ? " · " + escapeHtml(item.date) : "") +
    "</p>" +
    '<p class="tt-row tt-task' +
    strike +
    '"><span class="tt-meta-label">Task</span> ' +
    escapeHtml(item.task || "—") +
    "</p>" +
    "</div>" +
    '<div class="tt-actions">' +
    '<button type="button" class="icon-btn" title="Mark done" data-action="toggle" aria-label="Mark complete">' +
    (done ? "✓" : "○") +
    "</button>" +
    '<button type="button" class="icon-btn danger" title="Delete" data-action="delete" aria-label="Delete">×</button>' +
    "</div>" +
    "</article>"
  );
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function getTimetableDateParam() {
  const input = document.getElementById("timetable-date");
  const v = input && input.value ? input.value : window.localDateYMD();
  return v;
}

window.refreshTimetable = async function refreshTimetable() {
  const list = document.getElementById("timetable-list");
  const token = localStorage.getItem("token");
  if (!list || !token) return;
  list.innerHTML = '<p class="muted">Loading…</p>';
  const date = getTimetableDateParam();
  const url = TIMETABLE_API + "?date=" + encodeURIComponent(date);
  try {
    const res = await fetch(url, { headers: window.authHeaders(false) });
    const data = await window.readJson(res);
    if (!res.ok) throw new Error(data.message || "Failed to load");
    if (!data.length) {
      list.innerHTML =
        '<p class="muted">No subjects for this day — add one on the left (set the date first).</p>';
      return;
    }
    list.innerHTML = data.map(cardHtml).join("");
  } catch (e) {
    list.innerHTML = '<p class="muted">Could not load timetable.</p>';
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("timetable-form");
  const msg = document.getElementById("timetable-form-msg");
  const list = document.getElementById("timetable-list");
  const dateInput = document.getElementById("timetable-date");

  if (dateInput && !dateInput.value) {
    dateInput.value = window.localDateYMD();
  }

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      if (typeof window.refreshTimetable === "function") window.refreshTimetable();
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.textContent = "";
      const fd = new FormData(form);
      const body = {
        name: fd.get("name"),
        difficulty: fd.get("difficulty"),
        start: fd.get("start"),
        end: fd.get("end"),
        task: fd.get("task") || "",
        date: fd.get("date") || window.localDateYMD(),
      };
      try {
        const res = await fetch(TIMETABLE_API, {
          method: "POST",
          headers: window.authHeaders(true),
          body: JSON.stringify(body),
        });
        const data = await window.readJson(res);
        if (!res.ok) throw new Error(data.message || "Save failed");
        msg.textContent = "Saved!";
        window.refreshTimetable();
      } catch (ex) {
        msg.textContent = ex.message;
      }
    });
  }

  if (list) {
    list.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const card = btn.closest("[data-id]");
      if (!card) return;
      const id = card.getAttribute("data-id");
      const action = btn.getAttribute("data-action");

      if (action === "toggle") {
        try {
          const res = await fetch(TIMETABLE_API + "/" + id + "/toggle", {
            method: "PATCH",
            headers: window.authHeaders(true),
            body: "{}",
          });
          const data = await window.readJson(res);
          if (!res.ok) throw new Error(data.message || "Update failed");
          window.refreshTimetable();
        } catch (ex) {
          alert(ex.message);
        }
        return;
      }

      if (action === "delete") {
        if (!confirm("Delete this subject?")) return;
        try {
          const res = await fetch(TIMETABLE_API + "/" + id, {
            method: "DELETE",
            headers: window.authHeaders(false),
          });
          const data = await window.readJson(res);
          if (!res.ok) throw new Error(data.message || "Delete failed");
          window.refreshTimetable();
        } catch (ex) {
          alert(ex.message);
        }
      }
    });
  }
});
