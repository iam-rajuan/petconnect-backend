import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { config } from "dotenv";
import User from "../modules/users/user.model";

config();

const MONGO_URI = process.env.MONGO_URI;

const run = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const existing = await User.findOne({ email: "admin@petconnect.com" });
  if (existing) {
    console.log("Admin user already exists. Nothing to do.");
    return;
  }


  const plainPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  await User.create({
    name: "Super Admin",
    email: "admin@petconnect.com",
    password: hashedPassword,
    role: "admin",
    isVerified: true,
    status: "active",
    isSuspended: false,
    profileCompleted: true,
  });

  console.log("Admin user created:");
  console.log(`email: admin@petconnect.com`);
  console.log(`password: ${plainPassword}`);
};

run()
  .catch((err) => {
    console.error("Failed to create admin user:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
