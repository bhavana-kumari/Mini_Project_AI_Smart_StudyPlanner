/**
 * Pomodoro Study Watch — 25 min study / 5 min break; logs minutes to the backend.
 */

const STUDY_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

document.addEventListener("DOMContentLoaded", () => {
  const phaseEl = document.getElementById("pomodoro-phase");
  const timeEl = document.getElementById("pomodoro-time");
  const hintEl = document.getElementById("pomodoro-hint");
  const btnStart = document.getElementById("pom-start");
  const btnPause = document.getElementById("pom-pause");
  const btnReset = document.getElementById("pom-reset");
  const todayStudy = document.getElementById("today-study");
  const todayBreak = document.getElementById("today-break");

  if (!timeEl || !btnStart) return;

  let mode = "idle"; // idle | study | break
  let remaining = STUDY_SEC;
  let timer = null;
  /** Minutes accumulated this browser session (shown as "today" alongside server totals) */
  let sessionStudy = 0;
  let sessionBreak = 0;

  function format(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function setPhaseLabel() {
    if (mode === "study") {
      phaseEl.textContent = "Focus session";
      hintEl.textContent = "Stay on task — short breaks reward deep work.";
    } else if (mode === "break") {
      phaseEl.textContent = "Break time";
      hintEl.textContent = "Stretch, hydrate, then reset for the next round.";
    } else {
      phaseEl.textContent = "Ready";
      hintEl.textContent = "Press Start to begin a 25-minute study session.";
    }
  }

  function syncDisplay() {
    timeEl.textContent = format(remaining);
    setPhaseLabel();
    if (todayStudy) todayStudy.textContent = String(sessionStudy);
    if (todayBreak) todayBreak.textContent = String(sessionBreak);
  }

  async function logMinutes(studyMinutes, breakMinutes) {
    const date = typeof window.localDateYMD === "function" ? window.localDateYMD() : null;
    if (!date) return;
    try {
      await fetch(window.apiBase + "/time/log", {
        method: "POST",
        headers: window.authHeaders(true),
        body: JSON.stringify({ studyMinutes, breakMinutes, date }),
      });
    } catch (e) {
      console.warn("Could not sync timer to server", e);
    }
  }

  function tick() {
    if (remaining <= 0) {
      clearInterval(timer);
      timer = null;
      if (mode === "study") {
        sessionStudy += 25;
        logMinutes(25, 0);
        mode = "break";
        remaining = BREAK_SEC;
        btnPause.disabled = false;
        syncDisplay();
        startTimer();
      } else if (mode === "break") {
        sessionBreak += 5;
        logMinutes(0, 5);
        mode = "study";
        remaining = STUDY_SEC;
        syncDisplay();
        startTimer();
      }
      return;
    }
    remaining -= 1;
    syncDisplay();
  }

  function startTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(tick, 1000);
  }

  btnStart.addEventListener("click", () => {
    if (mode === "idle") {
      mode = "study";
      remaining = STUDY_SEC;
    }
    btnPause.disabled = false;
    btnPause.textContent = "Pause";
    startTimer();
    syncDisplay();
  });

  /** Pause / resume without resetting the countdown */
  btnPause.addEventListener("click", () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      btnPause.textContent = "Resume";
      return;
    }
    if (mode !== "idle" && remaining > 0) {
      btnPause.textContent = "Pause";
      startTimer();
    }
  });

  btnReset.addEventListener("click", () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    mode = "idle";
    remaining = STUDY_SEC;
    btnPause.disabled = true;
    btnPause.textContent = "Pause";
    syncDisplay();
  });

  syncDisplay();
});
