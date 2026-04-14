/**
 * Dashboard shell: tab switching, logout, and routing between auth views.
 */

function setView(id) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

window.showLoginView = function showLoginView() {
  setView("view-login");
};

window.showSignupView = function showSignupView() {
  setView("view-signup");
};

/** Long form e.g. Monday, 15 April 2026 */
function formatDashboardDate(d) {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return (
    weekdays[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear()
  );
}

window.refreshDashDate = function refreshDashDate() {
  const el = document.getElementById("dash-date-line");
  if (el) el.textContent = formatDashboardDate(new Date());
};

window.enterDashboard = function enterDashboard(user) {
  setView("view-dashboard");
  const welcome = document.getElementById("welcome-msg");
  if (welcome && user && user.name) {
    welcome.textContent = "Welcome back, " + user.name + "!";
  }
  if (typeof window.refreshDashDate === "function") window.refreshDashDate();
  if (typeof window.refreshTimetable === "function") window.refreshTimetable();
};

function showPanel(name) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.add("hidden"));
  const panel = document.getElementById("panel-" + name);
  if (panel) panel.classList.remove("hidden");

  document.querySelectorAll(".tab").forEach((t) => {
    const on = t.getAttribute("data-tab") === name;
    t.classList.toggle("active", on);
    t.setAttribute("aria-selected", on ? "true" : "false");
  });

  // Lazy-load chart when Progress tab opens
  if (name === "progress" && typeof window.loadProgressData === "function") {
    window.loadProgressData();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");

  // If token exists, try silent login
  if (token) {
    try {
      const res = await fetch(window.apiBase + "/auth/me", { headers: window.authHeaders(false) });
      if (res.ok) {
        const data = await res.json();
        window.enterDashboard(data.user);
      } else {
        localStorage.removeItem("token");
        window.showLoginView();
      }
    } catch {
      localStorage.removeItem("token");
      window.showLoginView();
    }
  } else {
    window.showLoginView();
  }

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-tab");
      if (name) showPanel(name);
    });
  });

  const logout = document.getElementById("btn-logout");
  if (logout) {
    logout.addEventListener("click", () => {
      localStorage.removeItem("token");
      window.showLoginView();
    });
  }
});
