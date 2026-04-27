/**
 * Shared API helpers (used by all client scripts after this file loads).
 */
window.apiBase = "/api";

/** Local calendar date as YYYY-MM-DD (for daily logs & filters). */
window.localDateYMD = function localDateYMD() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
};

window.authHeaders = function authHeaders(includeJson = true) {
  const headers = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  const token = localStorage.getItem("token");
  if (token) headers.Authorization = "Bearer " + token;
  return headers;
};

/**
 * Read JSON responses safely.
 * Prevents "Unexpected token '<'" when the server returns HTML (SPA fallback / error page).
 */
window.readJson = async function readJson(res) {
  const ct = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
  const text = await res.text();
  const looksJson = ct.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[");

  if (!looksJson) {
    console.log("Non-JSON response received:", text.slice(0, 600));
    throw new Error("Unexpected server response (not JSON). Check API URL / server logs.");
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.log("Invalid JSON received:", text.slice(0, 600));
    throw new Error("Invalid JSON returned by server.");
  }
};

/**
 * Google sends the ID token here after user signs in with Google.
 */
window.handleGoogleCredential = async function handleGoogleCredential(response) {
  const errLogin = document.getElementById("login-error");
  const errSignup = document.getElementById("signup-error");
  try {
    const res = await fetch(window.apiBase + "/auth/google", {
      method: "POST",
      headers: window.authHeaders(true),
      body: JSON.stringify({ credential: response.credential }),
    });
    const data = await window.readJson(res);
    if (!res.ok) throw new Error(data.message || "Google sign-in failed");
    localStorage.setItem("token", data.token);
    if (typeof window.enterDashboard === "function") window.enterDashboard(data.user);
  } catch (e) {
    const msg = e.message || "Google sign-in failed";
    if (errLogin && !document.getElementById("view-login").classList.contains("hidden")) {
      errLogin.textContent = msg;
      errLogin.hidden = false;
    }
    if (errSignup && !document.getElementById("view-signup").classList.contains("hidden")) {
      errSignup.textContent = msg;
      errSignup.hidden = false;
    }
  }
};

/**
 * Google Identity Services: initialize once, render buttons for login + signup views.
 */
function initGoogleButtons() {
  function tryInit() {
    if (!window.google || !google.accounts || !google.accounts.id) {
      return setTimeout(tryInit, 120);
    }
    google.accounts.id.initialize({
      client_id: "418217303504-foqvv7g2b4rtju2vibdidvaqvidf75dp.apps.googleusercontent.com",
      callback: window.handleGoogleCredential,
    });
    function renderBtn(containerId, text) {
      const el = document.getElementById(containerId);
      if (!el) return;
      google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        width: 320,
        text: text,
      });
    }
    renderBtn("google-btn-login", "continue_with");
    renderBtn("google-btn-signup", "signup_with");
  }
  tryInit();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const err = document.getElementById("login-error");
  const goSignup = document.getElementById("go-signup");

  initGoogleButtons();

  if (goSignup) {
    goSignup.addEventListener("click", () => {
      if (typeof window.showSignupView === "function") window.showSignupView();
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      const fd = new FormData(form);
      const body = {
        email: fd.get("email"),
        password: fd.get("password"),
      };
      try {
        const res = await fetch(window.apiBase + "/auth/login", {
          method: "POST",
          headers: window.authHeaders(true),
          body: JSON.stringify(body),
        });
        const data = await window.readJson(res);
        if (!res.ok) throw new Error(data.message || "Login failed");
        localStorage.setItem("token", data.token);
        if (typeof window.enterDashboard === "function") window.enterDashboard(data.user);
      } catch (ex) {
        err.textContent = ex.message;
        err.hidden = false;
      }
    });
  }
});
