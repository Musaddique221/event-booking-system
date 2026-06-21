import { body } from "express-validator";

export const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),

  body("email").trim().isEmail().withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  body("role")
    .isIn(["organizer", "customer"])
    .withMessage("Role must be either 'organizer' or 'customer'"),
];

export const loginValidator = [
  body("email").trim().isEmail().withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];