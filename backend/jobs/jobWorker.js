import cron from "node-cron";
import Job from "../models/JobModel.js";

// This function processes a single job based on its type
const processJob = async (job) => {
  if (job.type === "BOOKING_CONFIRMATION") {
    const { customerName, customerEmail, eventTitle, numberOfTickets, totalAmount } =
      job.payload;

    // Simulating sending a confirmation email (console log as required by the assignment)
    console.log(
      `\n[EMAIL] Sending booking confirmation to ${customerName} (${customerEmail})\n` +
        `        Event: "${eventTitle}" | Tickets: ${numberOfTickets} | Amount: ₹${totalAmount}\n`
    );
  }

  if (job.type === "EVENT_UPDATE_NOTIFICATION") {
    const { eventTitle, customers } = job.payload;

    // Simulating sending a notification to every customer who booked this event
    customers.forEach((customer) => {
      console.log(
        `\n[NOTIFICATION] Notifying ${customer.customerName} (${customer.customerEmail})\n` +
          `               Event "${eventTitle}" has been updated.\n`
      );
    });
  }
};

// This is our "background worker" - it runs every 10 seconds using node-cron
// and acts like a simple job queue processor (without needing Redis/external queue)
const startJobWorker = () => {
  cron.schedule("*/10 * * * * *", async () => {
    try {
      // Pick a batch of pending jobs (limit to avoid processing too many at once)
      const pendingJobs = await Job.find({ status: "pending" }).limit(10);

      if (pendingJobs.length === 0) return;

      for (const job of pendingJobs) {
        // Mark as processing first, so the same job is not picked up twice
        job.status = "processing";
        await job.save();

        try {
          await processJob(job);
          job.status = "done";
        } catch (err) {
          job.status = "failed";
          job.attempts += 1;
          console.error(`Failed to process job ${job._id}:`, err.message);
        }

        await job.save();
      }
    } catch (error) {
      console.error("Job worker error:", error.message);
    }
  });

  console.log("Background job worker started (running every 10 seconds)");
};

export default startJobWorker;