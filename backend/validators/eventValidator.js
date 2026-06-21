import { body } from "express-validator";

// Event create karte time ye fields validate honge
export const createEventValidator = [
  body("title").trim().notEmpty().withMessage("Title is required"),

  body("description").trim().notEmpty().withMessage("Description is required"),

  body("venue").trim().notEmpty().withMessage("Venue is required"),

  body("date").isISO8601().withMessage("Please provide a valid date"),

  body("totalTickets")
    .isInt({ min: 1 })
    .withMessage("Total tickets must be at least 1"),

  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
];

// Event update ke time fields optional hote hain (jo bhejega wahi update hoga)
// isliye sirf format check karte hain, required nahi lagaya
export const updateEventValidator = [
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date"),

  body("totalTickets")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Total tickets must be at least 1"),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
];