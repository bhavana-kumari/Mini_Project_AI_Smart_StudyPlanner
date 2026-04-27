const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const aiScheduleController = require("../controllers/aiScheduleController");

const router = express.Router();

router.use(authMiddleware);
router.post("/", aiScheduleController.generateSchedule);

module.exports = router;
