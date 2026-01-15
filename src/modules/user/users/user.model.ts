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
  status: "active" | "deletion_request";
  isSuspended: boolean;
  bio?: string;
  avatarUrl?: string | null;
  address?: string | null;
  location?: {
    city?: string;
    country?: string;
  } | null;
  pets?: mongoose.Types.ObjectId[];
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  resetPasswordVerifiedExpires?: Date | null;
  favorites?: string[];
  profileCompleted?: boolean;
  blockedUsers?: mongoose.Types.ObjectId[];
  lastSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isPhoneVerified?: boolean;
  firebaseUid?: string | null;
  phoneVerificationToken?: string | null;
  phoneVerificationExpires?: Date | null;
  deletionRequestedAt?: Date | null;
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
      enum: ["active", "deletion_request"],
      default: "active",
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    bio: { type: String, default: "" },
    avatarUrl: { type: String, default: null },
    address: { type: String, default: "" },
    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
    },
    pets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Pet" }],
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
    resetPasswordVerifiedExpires: { type: Date, default: null },
    favorites: {
      type: [String],
      default: [],
    },
    blockedUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
    deletionRequestedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
