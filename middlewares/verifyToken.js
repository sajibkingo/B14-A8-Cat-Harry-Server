const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Unauthorized access: No token provided" });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || "super_secret_jwt_key_studiospace_2026",
        (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: "Unauthorized access: Invalid or expired token" });
            }
            req.user = decoded;
            next();
        }
    );
};

module.exports = verifyToken;