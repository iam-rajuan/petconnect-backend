const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      unique: true,
      sparse: true, // allows phone-only users
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
    },

    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["user", "provider", "admin"],
      default: "user",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
