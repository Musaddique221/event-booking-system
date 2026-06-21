import express from  "express"
import cors from "cors"
import morgan from "morgan"
import authRoutes from "./routes/authRoutes.js"
import eventRoutes from "./routes/eventRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";

const app = express()


app.use(cors())
app.use(express.json())
app.use(morgan("dev"))



app.get("/",(req,res)=>{
 res.send("Event Booking System API is running...");
})

// routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/bookings", bookingRoutes);


export default app