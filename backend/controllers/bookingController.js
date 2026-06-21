import Event from "../models/EventModel.js";
import Booking from "../models/BookingModel.js";
import Job from "../models/JobModel.js";

// @desc    Book tickets for an event
// @route   POST /api/bookings
// @access  Private (Customer only)
export const createBooking = async (req, res) => {
  try {
    const { eventId, numberOfTickets } = req.body;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.availableTickets < numberOfTickets) {
      return res.status(400).json({
        success: false,
        message: `Only ${event.availableTickets} tickets are available for this event`,
      });
    }

    // Atomic update: tickets check + decrement ek hi DB operation me hota hai
    // Isse race condition avoid hoti hai - agar 2 log same time pe book karein,
    // dono ki request ek dusre se overlap nahi karegi aur overbooking nahi hogi
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: eventId, availableTickets: { $gte: numberOfTickets } },
      { $inc: { availableTickets: -numberOfTickets } },
      { new: true }
    );

    // Agar updatedEvent null aaya, matlab beech me kisi aur ne tickets book kar liye
    // aur ab available tickets kam pad gaye (race condition case)
    if (!updatedEvent) {
      return res.status(400).json({
        success: false,
        message: "Tickets just got sold out. Please try with fewer tickets.",
      });
    }

    const totalAmount = numberOfTickets * event.price;

    const booking = await Booking.create({
      customer: req.user._id,
      event: event._id,
      numberOfTickets,
      totalAmount,
      status: "confirmed",
    });

    // ---- Background Task 1 Trigger: Booking Confirmation ----
    // We don't send the email here directly (that would block the response).
    // Instead, we create a pending Job which our node-cron worker will
    // pick up and process asynchronously in the background.
    await Job.create({
      type: "BOOKING_CONFIRMATION",
      payload: {
        bookingId: booking._id,
        customerName: req.user.name,
        customerEmail: req.user.email,
        eventTitle: event.title,
        numberOfTickets,
        totalAmount,
      },
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while creating booking",
      error: error.message,
    });
  }
};

// @desc    Get bookings of the logged-in customer
// @route   GET /api/bookings/my-bookings
// @access  Private (Customer only)
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id }).populate(
      "event",
      "title venue date price"
    );

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching your bookings",
      error: error.message,
    });
  }
};

// @desc    Cancel a booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private (Customer only - must be the owner of the booking)
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Ownership check - customer can only cancel their own booking
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. This is not your booking",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      });
    }

    booking.status = "cancelled";
    await booking.save();

    // Return the tickets back to the event's available pool
    await Event.findByIdAndUpdate(booking.event, {
      $inc: { availableTickets: booking.numberOfTickets },
    });

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while cancelling booking",
      error: error.message,
    });
  }
};