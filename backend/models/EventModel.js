import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
    },
    venue: {
      type: String,
      required: [true, "Venue is required"],
    },
    date: {
      type: Date,
      required: [true, "Event date is required"],
    },
    totalTickets: {
      type: Number,
      required: [true, "Total tickets count is required"],
      min: 1,
    },
    availableTickets: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: [true, "Ticket price is required"],
      min: 0,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
  },
  { timestamps: true }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;