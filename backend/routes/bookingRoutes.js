import express from "express";
import {
  createBooking,
  getMyBookings,
  cancelBooking,
} from "../controllers/bookingController.js";
import { createBookingValidator } from "../validators/bookingValidator.js";
import validateRequest from "../middlewares/validateRequest.js";
import protect from "../middlewares/authMiddleware.js";
import authorize from "../middlewares/roleMiddleware.js";

const router = express.Router();

// All booking routes require a logged-in customer
router.post(
  "/",
  protect,
  authorize("customer"),
  createBookingValidator,
  validateRequest,
  createBooking
);

router.get("/my-bookings", protect, authorize("customer"), getMyBookings);

router.put("/:id/cancel", protect, authorize("customer"), cancelBooking);

export default router;