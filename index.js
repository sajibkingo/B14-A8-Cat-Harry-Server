require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// CORS Setup (Vercel frontend ebong localhost er jonno)
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      /\.vercel\.app$/, // Shob Vercel deploy URL allow korar jonno
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Root health check route (run function er baire)
app.get("/", (req, res) => {
  res.send("StudioSpace Server is running smoothly on Vercel!");
});

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;

if (uri) {
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
  clientPromise = client.connect();
}

async function run() {
  try {
    if (!clientPromise) {
      console.error("MONGODB_URI missing in Environment Variables!");
      return;
    }
    await clientPromise;
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

    // 2. Clear JWT Cookie
    app.post("/api/auth/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .json({ success: true, message: "Cleared auth cookie" });
    });

    // 3. Update User Profile
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
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}

run().catch(console.dir);

// Local environment er jonno listen
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`StudioSpace server listening on port ${port}`);
  });
}

// Vercel serverless export er jonno mandatory
module.exports = app;