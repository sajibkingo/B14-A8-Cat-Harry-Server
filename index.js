const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// CORS setup
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Detect URI dynamically from various common naming conventions
const uri =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  (process.env.DB_USER && process.env.DB_PASS
    ? `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mongodb.net/?retryWrites=true&w=majority`
    : undefined);

if (!uri) {
  console.error(
    "MongoDB Connection Error: No valid connection string found in .env!\n" +
    "Please check your .env file and ensure MONGODB_URI (or DB_USER & DB_PASS) is defined."
  );
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("studiospace_db");
    const usersCollection = db.collection("user");

    console.log("Connected successfully to MongoDB Atlas!");

    // 1. Issue JWT Cookie
    app.post("/api/auth/jwt", (req, res) => {
      const user = req.body;
      if (!user?.email) {
        return res.status(400).json({ message: "User email required" });
      }

      const token = jwt.sign(
        user,
        process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || "super_secret_jwt_key_studiospace_2026",
        { expiresIn: "7d" }
      );

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        })
        .json({ success: true, message: "Security token initialized" });
    });

    // 2. Clear JWT Cookie on Logout
    app.post("/api/auth/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        })
        .json({ success: true, message: "Cleared auth cookie" });
    });

    // 3. User Profile Update
    app.patch("/api/auth/update-profile", async (req, res) => {
      try {
        const { email, name, image } = req.body;
        if (!email) {
          return res.status(400).json({ message: "User email required" });
        }

        const updateDoc = {
          $set: {
            name,
            image,
            updatedAt: new Date(),
          },
        };

        const result = await usersCollection.updateOne({ email }, updateDoc);
        res.json({ success: true, modifiedCount: result.modifiedCount });
      } catch (err) {
        res.status(500).json({ message: "Failed to update profile", error: err.message });
      }
    });

    // Mount modular routes
    const studioRoutes = require("./routes/studios")(db);
    const bookingRoutes = require("./routes/bookings")(db);

    app.use("/api/studios", studioRoutes);
    app.use("/api/bookings", bookingRoutes);

    app.get("/", (req, res) => {
      res.send("StudioSpace Server is running smoothly!");
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`StudioSpace server listening on port ${port}`);
});