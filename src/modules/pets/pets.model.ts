import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMedicalRecord {
  title: string;
  documentUrl: string;
  uploadedAt: Date;
}

export interface IPet extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  gender?: "male" | "female";
  bio?: string;
  avatarUrl?: string | null;
  photos: string[];
  medicalRecords: IMedicalRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const medicalRecordSchema = new Schema<IMedicalRecord>(
  {
    title: { type: String, required: true },
    documentUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const petSchema = new mongoose.Schema<IPet>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    species: { type: String, required: true },
    breed: { type: String },
    age: { type: Number },
    gender: { type: String, enum: ["male", "female"], default: undefined },
    bio: { type: String },
    avatarUrl: { type: String, default: null },
    photos: { type: [String], default: [] },
    medicalRecords: { type: [medicalRecordSchema], default: [] },
  },
  { timestamps: true }
);

const Pet: Model<IPet> = mongoose.model<IPet>("Pet", petSchema);

export default Pet;
