import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IRefreshToken extends Document {
  user: Types.ObjectId;
  token: string; // stored as hashed string
  expiresAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>(
  "RefreshToken",
  refreshTokenSchema
);

export default RefreshToken;
