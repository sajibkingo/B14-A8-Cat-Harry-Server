const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middlewares/verifyToken");

module.exports = (db) => {
    const studiosCollection = db.collection("studios");

    // Get all studios
    router.get("/", async (req, res) => {
        try {
            const { category, limit } = req.query;
            let query = {};
            if (category && category !== "All") {
                query.category = category;
            }
            let cursor = studiosCollection.find(query).sort({ _id: -1 });
            if (limit) {
                cursor = cursor.limit(parseInt(limit));
            }
            const result = await cursor.toArray();
            res.json(result);
        } catch (err) {
            res.status(500).json({ message: "Failed to fetch studios" });
        }
    });

    // Get my listings
    router.get("/my-listings", async (req, res) => {
        try {
            const { email } = req.query;
            if (!email) return res.status(400).json({ message: "Email required" });
            const result = await studiosCollection.find({ ownerEmail: email }).toArray();
            res.json(result);
        } catch (err) {
            res.status(500).json({ message: "Failed to fetch listings" });
        }
    });

    // Get single studio
    router.get("/:id", async (req, res) => {
        try {
            const result = await studiosCollection.findOne({ _id: new ObjectId(req.params.id) });
            if (!result) return res.status(404).json({ message: "Studio not found" });
            res.json(result);
        } catch (err) {
            res.status(500).json({ message: "Invalid ID" });
        }
    });

    // Protected: Create Studio
    router.post("/", verifyToken, async (req, res) => {
        try {
            const studioData = {
                ...req.body,
                hourlyRate: Number(req.body.hourlyRate),
                securityDeposit: Number(req.body.securityDeposit),
                maxCapacity: Number(req.body.maxCapacity),
                createdAt: new Date(),
            };
            const result = await studiosCollection.insertOne(studioData);
            res.status(201).json({ insertedId: result.insertedId, success: true });
        } catch (err) {
            res.status(500).json({ message: "Failed to create studio listing" });
        }
    });

    // Protected: Update Studio
    router.put("/:id", verifyToken, async (req, res) => {
        try {
            const { _id, ...updateData } = req.body;
            const result = await studiosCollection.updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: updateData }
            );
            res.json({ modifiedCount: result.modifiedCount, success: true });
        } catch (err) {
            res.status(500).json({ message: "Failed to update studio" });
        }
    });

    // Protected: Delete Studio
    router.delete("/:id", verifyToken, async (req, res) => {
        try {
            const result = await studiosCollection.deleteOne({ _id: new ObjectId(req.params.id) });
            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "Studio not found" });
            }
            res.json({ success: true, message: "Studio deleted successfully" });
        } catch (err) {
            res.status(500).json({ message: "Failed to delete studio" });
        }
    });

    return router;
};