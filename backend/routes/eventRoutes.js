import express from "express";
import {
  createEvent,
  getAllEvents,
  getEventById,
  getMyEvents,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";
import {
  createEventValidator,
  updateEventValidator,
} from "../validators/eventValidator.js";
import validateRequest from "../middlewares/validateRequest.js";
import protect from "../middlewares/authMiddleware.js";
import authorize from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.get("/", getAllEvents);

router.get("/my-events", protect, authorize("organizer"), getMyEvents);

router.post(
  "/",
  protect,
  authorize("organizer"),
  createEventValidator,
  validateRequest,
  createEvent
);

router.put(
  "/:id",
  protect,
  authorize("organizer"),
  updateEventValidator,
  validateRequest,
  updateEvent
);

router.delete("/:id", protect, authorize("organizer"), deleteEvent);

// ---- Public route (id wala sabse last me, taaki upar wale specific routes match ho jaye pehle) ----
router.get("/:id", getEventById);

export default router;