
# Event Booking System - Backend

A backend API for an Event Booking System built with **Node.js, Express.js, and MongoDB**.
It supports two types of users — **Event Organizers** and **Customers** — with role-based
access control, and uses a **node-cron based background job queue** to simulate booking
confirmation emails and event update notifications.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js + Express.js | REST API framework |
| MongoDB + Mongoose | Database & ODM |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | Password hashing |
| express-validator | Request input validation |
| node-cron | Background job processing (simulated job queue) |
| morgan | HTTP request logging |
| dotenv | Environment variable management |

---

## Project Structure

```
backend/
 ├── config/
 │    └── db.js                  # MongoDB connection setup
 ├── models/
 │    ├── UserModel.js            # User schema (organizer/customer)
 │    ├── EventModel.js           # Event schema
 │    ├── BookingModel.js         # Booking schema
 │    └── JobModel.js             # Background job queue schema
 ├── controllers/
 │    ├── authController.js       # Register/Login logic
 │    ├── eventController.js      # Event CRUD logic
 │    └── bookingController.js    # Booking logic
 ├── routes/
 │    ├── authRoutes.js
 │    ├── eventRoutes.js
 │    └── bookingRoutes.js
 ├── middlewares/
 │    ├── authMiddleware.js       # JWT verification (protect)
 │    ├── roleMiddleware.js       # Role-based access control (authorize)
 │    └── validateRequest.js      # express-validator error handler
 ├── validators/
 │    ├── authValidator.js
 │    ├── eventValidator.js
 │    └── bookingValidator.js
 ├── jobs/
 │    └── jobWorker.js            # node-cron worker that processes background jobs
 ├── utils/
 │    └── generateToken.js        # JWT token generator
 ├── app.js                       # Express app configuration (middlewares + routes)
 ├── server.js                    # Entry point (DB connect + server + job worker start)
 ├── .env                         # Environment variables (not committed)
 └── package.json
```

---

## Design Decisions

### 1. `app.js` vs `server.js` separation
`app.js` only configures the Express app (middlewares, routes). `server.js` is the actual
entry point — it loads environment variables, connects to MongoDB, starts the HTTP server,
and starts the background job worker. This separation keeps the app testable and clean
(e.g. `app.js` can be imported in tests without actually starting a server).

### 2. Role-Based Access Control (RBAC)
Every user has a `role` field (`organizer` or `customer`), set at registration. Two
middlewares enforce access control:
- **`protect`** — verifies the JWT token from the `Authorization: Bearer <token>` header
  and attaches the logged-in user to `req.user`.
- **`authorize(...roles)`** — checks if `req.user.role` is one of the allowed roles for
  that route. E.g. `authorize("organizer")` blocks customers from creating events.

This combination (`protect` + `authorize`) is applied on every route that needs restriction,
keeping access rules declarative and easy to read directly in the route definitions.

### 3. Password Security
Passwords are hashed using `bcryptjs` in a Mongoose `pre("save")` hook before being
stored, so plain text passwords never touch the database. The `password` field has
`select: false` in the schema, so it is excluded from query results by default unless
explicitly requested with `.select("+password")` (only needed during login).

### 4. Preventing Overbooking (Atomic Updates)
A naive "check availability, then update" approach can cause a race condition: two
customers booking the last available tickets at the same time could both succeed,
resulting in overbooking. To avoid this, booking uses a single atomic MongoDB operation:

```js
Event.findOneAndUpdate(
  { _id: eventId, availableTickets: { $gte: numberOfTickets } },
  { $inc: { availableTickets: -numberOfTickets } },
  { new: true }
);
```

The ticket-count check and the decrement happen in the same atomic database operation,
so concurrent requests cannot both succeed when tickets are insufficient.

### 5. Background Jobs — node-cron based simple queue (no Redis required)
Instead of processing emails/notifications synchronously inside the API request (which
would slow down the response), a `Job` collection in MongoDB acts as a lightweight queue:

- When a **booking is created**, a `BOOKING_CONFIRMATION` job is inserted with
  `status: "pending"`.
- When an **event is updated**, an `EVENT_UPDATE_NOTIFICATION` job is inserted containing
  the list of all customers who booked that event.
- A **node-cron** worker (`jobs/jobWorker.js`) runs every 10 seconds, picks up pending
  jobs, marks them `processing`, executes them (console logs simulating email/notification),
  and marks them `done` (or `failed` with an `attempts` counter on error).

This keeps the API response fast (the job is just queued, not executed inline) and
mimics how a real-world job queue (e.g. BullMQ + Redis) would behave, without requiring
extra infrastructure like Redis for this assignment.

### 6. Ticket Price History
`Booking.totalAmount` is calculated and stored at the time of booking
(`numberOfTickets * event.price`), instead of being calculated dynamically later. This way,
if an organizer changes the event price afterward, past bookings retain the price the
customer actually paid.

### 7. Consistent API Response Format
Every response follows the same shape:
```json
{ "success": true/false, "message": "...", "data": {...} }
```
This makes it predictable for any frontend/client consuming the API.

### 8. Input Validation
`express-validator` is used to validate request bodies (e.g. valid email, password length,
required fields, valid role, valid date format) before the request even reaches the
controller. A shared `validateRequest` middleware collects and returns validation errors
in a consistent format.

---

## Setup & Installation

1. Clone the repository and navigate to the `backend` folder:
   ```bash
   cd backend
   npm install
   ```

2. Create a `.env` file inside `backend/` with the following variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   ```

3. Run the server:
   ```bash
   npm run dev    # using nodemon (development)
   # or
   npm start      # production
   ```

On successful start, you should see:
```
MongoDB Connected: ...
Server running on http://localhost:5000
Background job worker started (running every 10 seconds)
```

---

## API Endpoints

### Auth Routes — `/api/auth`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new user (organizer or customer) |
| POST | `/login` | Public | Login and receive a JWT token |

### Event Routes — `/api/events`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | Public | Get all events |
| GET | `/:id` | Public | Get a single event by id |
| GET | `/my-events` | Organizer | Get events created by the logged-in organizer |
| POST | `/` | Organizer | Create a new event |
| PUT | `/:id` | Organizer (owner only) | Update an event (triggers notification job) |
| DELETE | `/:id` | Organizer (owner only) | Delete an event |

### Booking Routes — `/api/bookings`
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Customer | Book tickets for an event (triggers confirmation job) |
| GET | `/my-bookings` | Customer | Get the logged-in customer's bookings |
| PUT | `/:id/cancel` | Customer (owner only) | Cancel a booking (returns tickets to pool) |

All private routes require the header:
```
Authorization: Bearer <token>
```

---

## Background Tasks

### Task 1: Booking Confirmation
- **Trigger:** A customer successfully books tickets (`POST /api/bookings`)
- **What happens:** A `BOOKING_CONFIRMATION` job is queued in the `Job` collection.
  Within 10 seconds, the cron worker processes it and logs:
  ```
  [EMAIL] Sending booking confirmation to <name> (<email>)
          Event: "<event title>" | Tickets: <count> | Amount: ₹<amount>
  ```

### Task 2: Event Update Notification
- **Trigger:** An organizer updates an event (`PUT /api/events/:id`)
- **What happens:** All customers with a confirmed booking for that event are fetched,
  and an `EVENT_UPDATE_NOTIFICATION` job is queued. The cron worker processes it and logs
  one notification per affected customer:
  ```
  [NOTIFICATION] Notifying <name> (<email>)
                 Event "<event title>" has been updated.
  ```

---

## Sample User Flow

1. Register as an **organizer** → login → create an event.
2. Register as a **customer** → login → browse events → book tickets.
3. Wait up to 10 seconds → check the server console for the booking confirmation log.
4. Organizer updates the event → wait up to 10 seconds → check the server console for
   notification logs sent to every customer who booked that event.