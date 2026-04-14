const express = require("express");
const timetableController = require("../controllers/timetableController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", timetableController.list);
router.post("/", timetableController.create);
router.patch("/:id", timetableController.update);
router.delete("/:id", timetableController.remove);
router.patch("/:id/toggle", timetableController.toggleComplete);

module.exports = router;
