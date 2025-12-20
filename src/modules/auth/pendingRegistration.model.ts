import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPendingRegistration extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string; // already hashed
  otp: string;
  otpExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    phone: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

pendingRegistrationSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

const PendingRegistration: Model<IPendingRegistration> = mongoose.model<IPendingRegistration>(
  "PendingRegistration",
  pendingRegistrationSchema
);

export default PendingRegistration;
