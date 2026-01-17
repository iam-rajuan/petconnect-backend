import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPetType extends Document {
  name: string;
  slug: string;
  breeds: Array<{
    _id?: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const petBreedSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const petTypeSchema = new Schema<IPetType>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    breeds: { type: [petBreedSchema], default: [] },
  },
  { timestamps: true }
);

const PetType: Model<IPetType> = mongoose.model<IPetType>("PetType", petTypeSchema);

export default PetType;
