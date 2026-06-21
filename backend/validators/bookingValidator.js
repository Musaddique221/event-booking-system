import { body } from "express-validator";

export const createBookingValidator = [
  body("eventId").notEmpty().withMessage("Event id is required"),

  body("numberOfTickets")
    .isInt({ min: 1 })
    .withMessage("Number of tickets must be at least 1"),
];