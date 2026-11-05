import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";

const router = express.Router();

async function getBookingsCollection() {
    const db = await connectDB();
    return db.collection("bookings");
}

router.get("/user", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ message: "User email is required" });
        }

        const bookingsCollection = await getBookingsCollection();
        const result = await bookingsCollection
            .find({ userEmail: email })
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch bookings", error: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const { studioId, studioTitle, userEmail, userName, bookingDate, startTime, endTime, totalPrice } = req.body;

        if (!studioId || !userEmail || !bookingDate || !startTime || !endTime) {
            return res.status(400).json({ message: "All required booking fields must be provided" });
        }

        const bookingsCollection = await getBookingsCollection();

        const existingBooking = await bookingsCollection.findOne({
            studioId: studioId,
            bookingDate: bookingDate,
            status: "Confirmed",
            $or: [
                {
                    startTime: { $lt: endTime },
                    endTime: { $gt: startTime },
                },
            ],
        });

        if (existingBooking) {
            return res.status(409).json({
                message: "This time slot is already booked for this studio. Please choose another slot.",
            });
        }

        const newBooking = {
            studioId,
            studioTitle,
            userEmail,
            userName,
            bookingDate,
            startTime,
            endTime,
            totalPrice: Number(totalPrice),
            status: "Pending",
            createdAt: new Date(),
        };

        const result = await bookingsCollection.insertOne(newBooking);
        res.status(201).json({ success: true, insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ message: "Failed to create booking", error: error.message });
    }
});

router.patch("/:id/cancel", async (req, res) => {
    try {
        const { id } = req.params;
        const bookingsCollection = await getBookingsCollection();

        const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (booking.status !== "Pending") {
            return res.status(400).json({ message: "Only pending bookings can be cancelled" });
        }

        const result = await bookingsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: "Cancelled" } }
        );

        res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ message: "Failed to cancel booking", error: error.message });
    }
});

export default router;