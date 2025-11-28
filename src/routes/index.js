const express = require("express");
const router = express.Router();
const authRoutes = require("../modules/auth/auth.routes");

// Health Check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Auth Routes
router.use("/auth", authRoutes);

module.exports = router;
