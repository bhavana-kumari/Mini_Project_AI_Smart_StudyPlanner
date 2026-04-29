/**
 * Email signup — password is hashed on the server with bcrypt.
 */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form")
  const err = document.getElementById("signup-error")
  const goLogin = document.getElementById("go-login")

  if (goLogin) {
    goLogin.addEventListener("click", () => {
      if (typeof window.showLoginView === "function") window.showLoginView()
    })
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault()
      err.hidden = true
      const fd = new FormData(form)
      const body = {
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
      }
      try {
        const res = await fetch(window.apiBase + "/auth/signup", {
          method: "POST",
          headers: window.authHeaders(true),
          body: JSON.stringify(body),
        });
        const data = await window.readJson(res)
        if (!res.ok) throw new Error(data.message || "Signup failed")
        localStorage.setItem("token", data.token)
        if (typeof window.enterDashboard === "function") window.enterDashboard(data.user)
      } catch (ex) {
        err.textContent = ex.message
        err.hidden = false
      }
    })
  }
})
