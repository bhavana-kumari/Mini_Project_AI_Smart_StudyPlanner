const express = require("express");
const timeController = require("../controllers/timeController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/log", timeController.addMinutes);
router.get("/weekly", timeController.weeklyStudy);
router.get("/progress-summary", timeController.progressSummary);

module.exports = router;
