import mongoose, { Document, Model } from "mongoose";

export type UserRole = "user" | "provider" | "admin";

export interface IUser extends Document {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  username?: string;
  role: UserRole;
  isVerified: boolean;
  status: "pending" | "active" | "rejected";
  isSuspended: boolean;
  bio?: string;
  avatarUrl?: string | null;
  location?: {
    city?: string;
    country?: string;
  } | null;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  favorites?: string[];
  profileCompleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
  isPhoneVerified?: boolean;
  firebaseUid?: string | null;
  phoneVerificationToken?: string | null;
  phoneVerificationExpires?: Date | null;
}

const userSchema = new mongoose.Schema<IUser>(
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
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: false, default: null },
    role: {
      type: String,
      enum: ["user", "provider", "admin"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
      default: "pending",
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: null },
    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    firebaseUid: {
      type: String,
      default: null,
    },
    phoneVerificationToken: { type: String, default: null },
    phoneVerificationExpires: { type: Date, default: null },

    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    favorites: {
      type: [String],
      default: [],
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
