const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
    cors({
        origin: ["http://localhost:3000"],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// JWT Cookie Issuer Endpoint
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
        .json({ success: true });
});

// JWT Cookie Clear Endpoint
app.post("/api/auth/logout", (req, res) => {
    res
        .clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        })
        .json({ success: true });
});

// Routes mounting
const studioRoutes = require("./routes/studios");
const bookingRoutes = require("./routes/bookings");

app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);

app.get("/", (req, res) => {
    res.send("StudioSpace Server is running smoothly!");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});