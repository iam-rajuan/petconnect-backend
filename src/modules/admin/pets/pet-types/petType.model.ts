import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPetType extends Document {
  name: string;
  breeds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const petTypeSchema = new Schema<IPetType>(
  {
    name: { type: String, required: true, trim: true },
    breeds: { type: [String], default: [] },
  },
  { timestamps: true }
);

const PetType: Model<IPetType> = mongoose.model<IPetType>("PetType", petTypeSchema);

export default PetType;
