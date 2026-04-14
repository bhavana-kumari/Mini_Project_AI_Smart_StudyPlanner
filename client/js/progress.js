/**
 * Progress — day-wise stats + Mon–Sun chart (Chart.js).
 */

let weeklyChart = null;

window.loadProgressData = async function loadProgressData() {
  const studyEl = document.getElementById("stat-today-study");
  const breakEl = document.getElementById("stat-today-break");
  const tasksEl = document.getElementById("stat-today-tasks");
  const dayLabel = document.getElementById("progress-day-label");
  const dateLabel = document.getElementById("progress-date-label");
  const canvas = document.getElementById("weekly-chart");

  const date = window.localDateYMD();

  try {
    const res = await fetch(
      window.apiBase + "/time/progress-summary?date=" + encodeURIComponent(date),
      { headers: window.authHeaders(false) }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load progress");

    if (dayLabel) dayLabel.textContent = data.currentDayName || "Today";
    if (dateLabel) dateLabel.textContent = " · " + data.date;

    if (studyEl) studyEl.textContent = data.todayStudyMinutes ?? 0;
    if (breakEl) breakEl.textContent = data.todayBreakMinutes ?? 0;
    if (tasksEl) tasksEl.textContent = data.tasksCompletedToday ?? 0;

    const week = data.week || { labels: [], values: [] };

    if (canvas && typeof Chart !== "undefined") {
      const ctx = canvas.getContext("2d");
      if (weeklyChart) weeklyChart.destroy();
      weeklyChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: week.labels,
          datasets: [
            {
              label: "Study minutes",
              data: week.values,
              borderRadius: 10,
              backgroundColor: [
                "rgba(124, 58, 237, 0.65)",
                "rgba(6, 182, 212, 0.55)",
                "rgba(244, 114, 182, 0.5)",
                "rgba(52, 211, 153, 0.55)",
                "rgba(251, 191, 36, 0.45)",
                "rgba(99, 102, 241, 0.55)",
                "rgba(236, 72, 153, 0.5)",
              ],
              borderColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function (items) {
                  const i = items[0].dataIndex;
                  return (week.dates && week.dates[i]) || "";
                },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: "#94a3b8", font: { weight: "600" } },
              grid: { color: "rgba(255,255,255,0.06)" },
            },
            y: {
              beginAtZero: true,
              ticks: { color: "#94a3b8" },
              grid: { color: "rgba(255,255,255,0.06)" },
            },
          },
        },
      });
    }
  } catch (e) {
    console.error(e);
  }
};
