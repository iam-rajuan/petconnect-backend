import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMedicalRecord {
  title: string;
  documentUrl: string;
  uploadedAt: Date;
}

export type HealthRecordType =
  | "vaccination"
  | "checkup"
  | "medication"
  | "tick_flea"
  | "surgery"
  | "dental"
  | "other";

export interface IHealthRecord {
  type: HealthRecordType;
  recordDetails: {
    recordName: string;
    batchLotNo?: string;
    otherInfo?: string;
    cost?: string;
    date?: string;
    nextDueDate?: string;
    reminder?: {
      enabled: boolean;
      offset?: string;
    };
  };
  veterinarian: {
    designation?: string;
    name?: string;
    clinicName?: string;
    licenseNo?: string;
    contact?: string;
  };
  vitalSigns: {
    weight?: string;
    weightStatus?: "normal" | "high" | "low";
    temperature?: string;
    temperatureStatus?: "normal" | "high" | "low";
    heartRate?: string;
    heartRateStatus?: "normal" | "high" | "low";
    respiratory?: string;
    respiratoryRate?: string;
    respiratoryRateStatus?: "normal" | "high" | "low";
    status?: "normal" | "high" | "low";
  };
  observation: {
    lookupObservations?: string[];
    clinicalNotes?: string;
  };
  attachments?: string[];
}

export interface IPet extends Document {
  owner: mongoose.Types.ObjectId;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  weightLbs?: number;
  gender?: "male" | "female";
  trained?: boolean;
  vaccinated?: boolean;
  neutered?: boolean;
  personality?: string[];
  bio?: string;
  avatarUrl?: string | null;
  photos: string[];
  medicalRecords: IMedicalRecord[];
  healthRecords: IHealthRecord[];
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

const healthRecordSchema = new Schema<IHealthRecord>({
  type: {
    type: String,
    enum: [
      "vaccination",
      "checkup",
      "medication",
      "tick_flea",
      "surgery",
      "dental",
      "other",
    ],
    required: true,
  },
  recordDetails: {
    recordName: { type: String, required: true },
    batchLotNo: { type: String, default: "" },
    otherInfo: { type: String, default: "" },
    cost: { type: String, default: "" },
    date: { type: String, default: "" },
    nextDueDate: { type: String, default: "" },
    reminder: {
      enabled: { type: Boolean, default: false },
      offset: { type: String, default: "" },
    },
  },
  veterinarian: {
    designation: { type: String, default: "" },
    name: { type: String, default: "" },
    clinicName: { type: String, default: "" },
    licenseNo: { type: String, default: "" },
    contact: { type: String, default: "" },
  },
  vitalSigns: {
    weight: { type: String, default: "" },
    weightStatus: { type: String, enum: ["normal", "high", "low"], default: undefined },
    temperature: { type: String, default: "" },
    temperatureStatus: { type: String, enum: ["normal", "high", "low"], default: undefined },
    heartRate: { type: String, default: "" },
    heartRateStatus: { type: String, enum: ["normal", "high", "low"], default: undefined },
    respiratory: { type: String, default: "" },
    respiratoryRate: { type: String, default: "" },
    respiratoryRateStatus: {
      type: String,
      enum: ["normal", "high", "low"],
      default: undefined,
    },
    status: { type: String, enum: ["normal", "high", "low"], default: "normal" },
  },
  observation: {
    lookupObservations: { type: [String], default: [] },
    clinicalNotes: { type: String, default: "" },
  },
  attachments: { type: [String], default: [] },
});

const petSchema = new mongoose.Schema<IPet>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    species: { type: String, required: true },
    breed: { type: String },
    age: { type: Number },
    weightLbs: { type: Number },
    gender: { type: String, enum: ["male", "female"], default: undefined },
    trained: { type: Boolean },
    vaccinated: { type: Boolean },
    neutered: { type: Boolean },
    personality: { type: [String], default: [] },
    bio: { type: String },
    avatarUrl: { type: String, default: null },
    photos: { type: [String], default: [] },
    medicalRecords: { type: [medicalRecordSchema], default: [] },
    healthRecords: { type: [healthRecordSchema], default: [] },
  },
  { timestamps: true }
);

const Pet: Model<IPet> = mongoose.model<IPet>("Pet", petSchema);

export default Pet;
