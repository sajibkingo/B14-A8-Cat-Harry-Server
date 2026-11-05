const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middlewares/verifyToken");

module.exports = (db) => {
    const bookingsCollection = db.collection("bookings");

    // Get user bookings
    router.get("/user", async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) return res.status(400).json({ message: "Email required" });
            const result = await bookingsCollection
                .find({ userEmail: email })
                .sort({ _id: -1 })
                .toArray();
            res.json(result);
        } catch (err) {
            res.status(500).json({ message: "Failed to fetch bookings" });
        }
    });

    // Protected: Create Booking with Overlap Check
    router.post("/", verifyToken, async (req, res) => {
        try {
            const { studioId, bookingDate, startTime, endTime, totalPrice, studioTitle, userEmail, userName } = req.body;

            if (!studioId || !bookingDate || !startTime || !endTime) {
                return res.status(400).json({ message: "Missing required booking details" });
            }

            // MongoDB Challenge 2: Collision check for Confirmed or Pending slots
            const conflictingBooking = await bookingsCollection.findOne({
                studioId: studioId,
                bookingDate: bookingDate,
                status: { $in: ["Confirmed", "Pending"] },
                $and: [
                    { startTime: { $lt: endTime } },
                    { endTime: { $gt: startTime } },
                ],
            });

            if (conflictingBooking) {
                return res.status(409).json({
                    message: `Slot collision detected! This workspace is already reserved between ${conflictingBooking.startTime} and ${conflictingBooking.endTime} on ${bookingDate}. Please pick another time slot.`,
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
            res.status(201).json({ insertedId: result.insertedId, success: true });
        } catch (err) {
            res.status(500).json({ message: "Server error creating reservation" });
        }
    });

    // Protected: Cancel Booking
    router.patch("/:id/cancel", verifyToken, async (req, res) => {
        try {
            const result = await bookingsCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: { status: "Cancelled", cancelledAt: new Date() } }
            );
            res.json({ success: true, message: "Booking cancelled" });
        } catch (err) {
            res.status(500).json({ message: "Failed to cancel booking" });
        }
    });

    return router;
};