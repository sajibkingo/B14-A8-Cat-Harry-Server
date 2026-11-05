import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./db.js";

import studioRoutes from "./routes/studios.js";
import bookingRoutes from "./routes/bookings.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
    cors({
        origin: [process.env.CLIENT_URL || "http://localhost:3000"],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    res.send("StudioSpace Server is running smoothly!");
});

app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);

async function startServer() {
    await connectDB();
    app.listen(port, () => {
        console.log(`StudioSpace Server is running on port: ${port}`);
    });
}

startServer();