import express from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../db.js";

const router = express.Router();

async function getStudiosCollection() {
    const db = await connectDB();
    return db.collection("studios");
}

router.get("/", async (req, res) => {
    try {
        const { category, limit } = req.query;
        const studiosCollection = await getStudiosCollection();

        let query = {};
        if (category && category !== "All") {
            query.category = category;
        }

        let cursor = studiosCollection.find(query).sort({ _id: -1 });

        if (limit) {
            cursor = cursor.limit(parseInt(limit));
        }

        const result = await cursor.toArray();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch studios", error: error.message });
    }
});

router.get("/my-listings", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ message: "User email is required" });
        }

        const studiosCollection = await getStudiosCollection();
        const result = await studiosCollection.find({ ownerEmail: email }).toArray();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch user listings", error: error.message });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const studiosCollection = await getStudiosCollection();
        const studio = await studiosCollection.findOne({ _id: new ObjectId(id) });

        if (!studio) {
            return res.status(404).json({ message: "Studio not found" });
        }

        res.status(200).json(studio);
    } catch (error) {
        res.status(500).json({ message: "Invalid Studio ID", error: error.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const studioData = req.body;
        const studiosCollection = await getStudiosCollection();

        const newStudio = {
            title: studioData.title,
            category: studioData.category,
            hourlyRate: Number(studioData.hourlyRate),
            securityDeposit: Number(studioData.securityDeposit),
            maxCapacity: Number(studioData.maxCapacity),
            location: studioData.location,
            image: studioData.image,
            amenities: studioData.amenities || [],
            description: studioData.description,
            ownerEmail: studioData.ownerEmail,
            ownerName: studioData.ownerName,
            rating: 4.8,
            createdAt: new Date(),
        };

        const result = await studiosCollection.insertOne(newStudio);
        res.status(201).json({ success: true, insertedId: result.insertedId });
    } catch (error) {
        res.status(500).json({ message: "Failed to add studio", error: error.message });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const studiosCollection = await getStudiosCollection();

        const updatedDoc = {
            $set: {
                title: updateData.title,
                category: updateData.category,
                hourlyRate: Number(updateData.hourlyRate),
                securityDeposit: Number(updateData.securityDeposit),
                maxCapacity: Number(updateData.maxCapacity),
                location: updateData.location,
                image: updateData.image,
                amenities: updateData.amenities || [],
                description: updateData.description,
            },
        };

        const result = await studiosCollection.updateOne(
            { _id: new ObjectId(id) },
            updatedDoc
        );

        res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ message: "Failed to update studio", error: error.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const studiosCollection = await getStudiosCollection();

        const result = await studiosCollection.deleteOne({ _id: new ObjectId(id) });
        res.status(200).json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete studio", error: error.message });
    }
});

export default router;