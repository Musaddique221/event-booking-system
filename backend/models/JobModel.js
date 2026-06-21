import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["BOOKING_CONFIRMATION", "EVENT_UPDATE_NOTIFICATION"],
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed, 
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed"],
      default: "pending",
    },
    attempts: {
      type: Number,
      default: 0, 
    },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;