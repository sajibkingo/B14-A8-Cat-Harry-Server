require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            /\.vercel\.app$/,
        ],
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

// Root Route
app.get("/", (req, res) => {
    res.send("StudioSpace Server is running smoothly on Vercel!");
});

// MongoDB Serverless Connection Caching
const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (!global._mongoClientPromise) {
    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });
    global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

// Helper to get collections safely in Serverless
async function getDb() {
    const connectedClient = await clientPromise;
    return connectedClient.db("studiospace_db");
}

// Token Verification Helper
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized access: No token provided" });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET || "super_secret_jwt_key_studiospace_2026",
        (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: "Unauthorized access: Invalid or expired token" });
            }
            req.user = decoded;
            next();
        }
    );
};

// --- AUTH ROUTES ---
app.post("/api/auth/jwt", (req, res) => {
    const user = req.body;
    if (!user?.email) {
        return res.status(400).json({ message: "User email required" });
    }

    const token = jwt.sign(
        user,
        process.env.JWT_SECRET || "super_secret_jwt_key_studiospace_2026",
        { expiresIn: "7d" }
    );

    res
        .cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        })
        .json({ success: true, message: "Security token initialized" });
});

app.post("/api/auth/logout", (req, res) => {
    res
        .clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        })
        .json({ success: true, message: "Cleared auth cookie" });
});

app.patch("/api/auth/update-profile", async (req, res) => {
    try {
        const { email, name, image } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });

        const db = await getDb();
        const result = await db.collection("user").updateOne(
            { email },
            { $set: { name, image, updatedAt: new Date() } }
        );
        res.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ message: "Failed to update profile", error: err.message });
    }
});

// --- STUDIOS ROUTES ---
app.get("/api/studios", async (req, res) => {
    try {
        const db = await getDb();
        const { category, limit } = req.query;
        let query = {};
        if (category && category !== "All") {
            query.category = category;
        }
        let cursor = db.collection("studios").find(query).sort({ _id: -1 });
        if (limit) {
            cursor = cursor.limit(parseInt(limit));
        }
        const result = await cursor.toArray();
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch studios", error: err.message });
    }
});

app.get("/api/studios/my-listings", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: "Email required" });
        const db = await getDb();
        const result = await db.collection("studios").find({ ownerEmail: email }).toArray();
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch listings" });
    }
});

app.get("/api/studios/:id", async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.collection("studios").findOne({ _id: new ObjectId(req.params.id) });
        if (!result) return res.status(404).json({ message: "Studio not found" });
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: "Invalid ID" });
    }
});

app.post("/api/studios", verifyToken, async (req, res) => {
    try {
        const db = await getDb();
        const studioData = {
            ...req.body,
            hourlyRate: Number(req.body.hourlyRate),
            securityDeposit: Number(req.body.securityDeposit),
            maxCapacity: Number(req.body.maxCapacity),
            createdAt: new Date(),
        };
        const result = await db.collection("studios").insertOne(studioData);
        res.status(201).json({ insertedId: result.insertedId, success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to create studio listing" });
    }
});

app.put("/api/studios/:id", verifyToken, async (req, res) => {
    try {
        const db = await getDb();
        const { _id, ...updateData } = req.body;
        const result = await db.collection("studios").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: updateData }
        );
        res.json({ modifiedCount: result.modifiedCount, success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to update studio" });
    }
});

app.delete("/api/studios/:id", verifyToken, async (req, res) => {
    try {
        const db = await getDb();
        const result = await db.collection("studios").deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true, message: "Studio deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete studio" });
    }
});

// --- BOOKINGS ROUTES ---
app.get("/api/bookings/user", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: "Email required" });
        const db = await getDb();
        const result = await db
            .collection("bookings")
            .find({ userEmail: email })
            .sort({ _id: -1 })
            .toArray();
        res.json(result);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch bookings" });
    }
});

app.post("/api/bookings", verifyToken, async (req, res) => {
    try {
        const db = await getDb();
        const { studioId, bookingDate, startTime, endTime, totalPrice, studioTitle, userEmail, userName } = req.body;

        const conflictingBooking = await db.collection("bookings").findOne({
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
                message: `Slot collision detected! Workspace already reserved between ${conflictingBooking.startTime} and ${conflictingBooking.endTime}.`,
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

        const result = await db.collection("bookings").insertOne(newBooking);
        res.status(201).json({ insertedId: result.insertedId, success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to create reservation" });
    }
});

app.patch("/api/bookings/:id/cancel", verifyToken, async (req, res) => {
    try {
        const db = await getDb();
        await db.collection("bookings").updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { status: "Cancelled", cancelledAt: new Date() } }
        );
        res.json({ success: true, message: "Booking cancelled" });
    } catch (err) {
        res.status(500).json({ message: "Failed to cancel booking" });
    }
});

if (process.env.NODE_ENV !== "production") {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

module.exports = app;