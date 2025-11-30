import mongoose, { Document, Model } from "mongoose";

export type UserRole = "user" | "provider" | "admin";

export interface IUser extends Document {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: UserRole;
  isVerified: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isPhoneVerified?: boolean;
firebaseUid?: string | null;

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
    isPhoneVerified: {
  type: Boolean,
  default: false,
},
firebaseUid: {
  type: String,
  default: null,
},

    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
