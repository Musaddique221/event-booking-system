import Event from "../models/EventModel.js";
import Booking from "../models/BookingModel.js";
import Job from "../models/JobModel.js";

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Organizer only)
export const createEvent = async (req, res) => {
  try {
    const { title, description, venue, date, totalTickets, price } = req.body;

    const event = await Event.create({
      title,
      description,
      venue,
      date,
      totalTickets,
      availableTickets: totalTickets, 
      price,
      organizer: req.user._id, 
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while creating event",
      error: error.message,
    });
  }
};

// @desc    Get all events (public - customers browse here)
// @route   GET /api/events
// @access  Public
export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().populate("organizer", "name email");

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching events",
      error: error.message,
    });
  }
};

// @desc    Get single event by id
// @route   GET /api/events/:id
// @access  Public
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "organizer",
      "name email"
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching event",
      error: error.message,
    });
  }
};

// @desc    Get events created by the logged-in organizer
// @route   GET /api/events/my-events
// @access  Private (Organizer only)
export const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while fetching your events",
      error: error.message,
    });
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (Organizer only - must be the owner)
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not the organizer of this event",
      });
    }

    const { title, description, venue, date, totalTickets, price } =
      req.body;

    if (title) event.title = title;
    if (description) event.description = description;
    if (venue) event.venue = venue;
    if (date) event.date = date;
    if (price !== undefined) event.price = price;

    if (totalTickets !== undefined) {
      const ticketsSold = event.totalTickets - event.availableTickets;
      event.totalTickets = totalTickets;
      event.availableTickets = totalTickets - ticketsSold;
    }

    await event.save();

    // ---- Background Task 2 Trigger: Event Update Notification ----
    // Jin customers ne is event ke liye booking ki hai, unhe notify karna hai
    // Hum yahan turant notification process nahi karte, balki ek Job create karte hain
    // jisko humara node-cron worker background me process karega (async, non-blocking)
    const bookings = await Booking.find({
      event: event._id,
      status: "confirmed",
    }).populate("customer", "name email");

    if (bookings.length > 0) {
      const customers = bookings.map((b) => ({
        customerId: b.customer._id,
        customerName: b.customer.name,
        customerEmail: b.customer.email,
      }));

      await Job.create({
        type: "EVENT_UPDATE_NOTIFICATION",
        payload: {
          eventId: event._id,
          eventTitle: event.title,
          customers,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while updating event",
      error: error.message,
    });
  }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private (Organizer only - must be the owner)
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not the organizer of this event",
      });
    }

    await event.deleteOne();

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while deleting event",
      error: error.message,
    });
  }
};