# AI Powered Smart Study Planner

Full-stack study planner with **vanilla HTML/CSS/JavaScript** on the frontend and **Node.js + Express + MongoDB (Mongoose)** on the backend. Includes JWT auth (with bcrypt), optional **Google Sign-In**, timetable CRUD, a simulated **AI weekly planner**, **Chart.js** progress stats, and a **Pomodoro** timer that logs minutes to the server.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally, or a MongoDB Atlas connection string

## Setup

1. **Install dependencies**

   ```bash
   cd ai_smart_study_planner
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` (or use the provided `.env`) and set:

   - `MONGODB_URI` — local or Atlas URI
   - `JWT_SECRET` — long random string (required for signing tokens)
   - `GOOGLE_CLIENT_ID` — must match the OAuth Web client used in the app (already set to your client ID)
   - `PORT` — optional, default `5000`

3. **Google Sign-In (production)**

   In [Google Cloud Console](https://console.cloud.google.com/), add **Authorized JavaScript origins** for your site, e.g. `http://localhost:5000`, so the Google button can return an ID token.

## Run

```bash
npm start
```

Open **http://localhost:5000** (or your `PORT`).

- **Development with auto-restart** (Node 18+):

  ```bash
  npm run dev
  ```

## Project layout

- `client/` — `index.html`, `css/style.css`, `js/*.js` (login, signup, dashboard, timetable, planner, progress, **watch** for Pomodoro)
- `server/` — `server.js`, `config/db.js`, `models/`, `controllers/`, `routes/`, `middleware/`

The backend exposes:

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/google`, `GET /api/auth/me`
- `GET|POST|PATCH|DELETE /api/timetable/...` (JWT required)
- `POST /api/time/log`, `GET /api/time/weekly`, `GET /api/time/stats`
- `GET /api/planner/generate` — builds a weekly plan from the user’s timetable (simulated “AI” logic)

## Notes

- JWT is stored in **localStorage** after login.
- Passwords are **bcrypt**-hashed; Google users may have no password.
- Streak counts **consecutive calendar days** (from today or yesterday) with at least one **completed** timetable task (`completedAt` set when you tick complete).
