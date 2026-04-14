const express = require("express");
const plannerController = require("../controllers/plannerController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.get("/today", plannerController.generateToday);
router.get("/weekly", plannerController.generateWeekly);

module.exports = router;
