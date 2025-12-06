import mongoose, { Document, Model, Schema } from "mongoose";

export type AdoptionStatus = "available" | "pending" | "adopted";

export interface IAdoptionListing extends Document {
  pet: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;

  // Listing info
  title: string;
  description?: string;
  location: string; // simple text for now, can be expanded later

  status: AdoptionStatus;

  // Denormalized pet snapshot for fast filtering
  petName: string;
  species: string;
  breed?: string;
  age?: number;
  gender?: "male" | "female";
  avatarUrl?: string | null;

  // Rescue / contact info
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const adoptionListingSchema = new Schema<IAdoptionListing>(
  {
    pet: { type: Schema.Types.ObjectId, ref: "Pet", required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ["available", "pending", "adopted"],
      default: "available",
      index: true,
    },

    petName: { type: String, required: true, trim: true },
    species: { type: String, required: true, trim: true },
    breed: { type: String, trim: true },
    age: { type: Number },
    gender: { type: String, enum: ["male", "female"], default: undefined },
    avatarUrl: { type: String, default: null },

    contactName: { type: String, required: true, trim: true },
    contactEmail: { type: String, default: null },
    contactPhone: { type: String, default: null },
  },
  { timestamps: true }
);

// Index for the main filters
adoptionListingSchema.index({
  status: 1,
  species: 1,
  breed: 1,
  location: 1,
  createdAt: -1,
});

const AdoptionListing: Model<IAdoptionListing> = mongoose.model<IAdoptionListing>(
  "AdoptionListing",
  adoptionListingSchema
);

export default AdoptionListing;
