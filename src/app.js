require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const routes = require("./routes"); // index.js

const app = express();

// basic middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// main API routes
app.use("/api/v1", routes);

// simple root route
app.get("/", (req, res) => {
  res.json({ message: "PetConnect API is running" });
});

// global error handler (Phase-1 simple)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
