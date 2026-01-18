import { z } from "zod";

const petTypeSchema = z.string().trim().min(2, "Pet type is required");
const bioSchema = z.string().trim().max(1000, "About must be at most 1000 characters");
const photoUrlSchema = z.string().trim().url("Invalid photo URL");
const avatarUrlSchema = z.string().trim().url("Invalid avatar URL");
const yesNoBooleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => {
    if (typeof val === "boolean") return val;
    const normalized = val.trim().toLowerCase();
    return normalized === "true" || normalized === "yes";
  });
const nonNegativeNumber = (message: string) =>
  z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }, z.number().min(0, message));

const numberSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number());
const stringArraySchema = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to comma-separated parsing
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return value;
}, z.array(z.string().trim().min(1)));
const personalitySchema = z.preprocess((value) => {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to comma-separated parsing
    }
    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return value;
}, z.array(z.string().trim().min(1)).max(5, "Max 5 personality traits"));

const healthRecordTypeSchema = z.enum([
  "vaccination",
  "checkup",
  "medication",
  "tick_flea",
  "surgery",
  "dental",
  "other",
]);

type HealthRecordType = z.infer<typeof healthRecordTypeSchema>;

const jsonSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }, schema);

const recordDetailsSchema = z.object({
  recordName: z.string().trim().min(1, "Record name is required"),
  batchLotNo: z.string().trim().optional(),
  otherInfo: z.string().trim().optional(),
  cost: z.string().trim().optional(),
  date: z.string().trim().optional(),
  nextDueDate: z.string().trim().optional(),
  reminder: z
    .object({
      enabled: z.boolean(),
      offset: z.string().trim().optional(),
    })
    .optional(),
});

const veterinarianSchema = z.object({
  designation: z.string().trim().optional(),
  name: z.string().trim().optional(),
  clinicName: z.string().trim().optional(),
  licenseNo: z.string().trim().optional(),
  contact: z.string().trim().optional(),
});

const statusSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized;
  }
  return value;
}, z.enum(["normal", "high", "low"]).optional());

const vitalSignsSchema = z.object({
  weight: z.string().trim().optional(),
  weightStatus: statusSchema,
  temperature: z.string().trim().optional(),
  temperatureStatus: statusSchema,
  heartRate: z.string().trim().optional(),
  heartRateStatus: statusSchema,
  respiratory: z.string().trim().optional(),
  respiratoryRate: z.string().trim().optional(),
  respiratoryRateStatus: statusSchema,
  status: z.enum(["normal", "high", "low"]).optional(),
});

const observationSchema = z.object({
  lookupObservations: z.array(z.string().trim().min(1)).optional(),
  clinicalNotes: z.string().trim().optional(),
});

const baseHealthRecordSchema = {
  recordDetails: jsonSchema(recordDetailsSchema).optional(),
  veterinarian: jsonSchema(veterinarianSchema).optional(),
  vitalSigns: jsonSchema(vitalSignsSchema).optional(),
  observation: jsonSchema(observationSchema).optional(),
};

const flatHealthRecordSchema = {
  recordType: z.string().trim().optional(),
  recordName: z.string().trim().optional(),
  batchNumber: z.string().trim().optional(),
  otherInfo: z.string().trim().optional(),
  cost: z.string().trim().optional(),
  date: z.string().trim().optional(),
  nextDueDate: z.string().trim().optional(),
  reminderEnabled: yesNoBooleanSchema.optional(),
  reminderDuration: z.string().trim().optional(),
  vetDesignation: z.string().trim().optional(),
  vetName: z.string().trim().optional(),
  clinicName: z.string().trim().optional(),
  licenseNumber: z.string().trim().optional(),
  vetContact: z.string().trim().optional(),
  weight: z.string().trim().optional(),
  weightStatus: statusSchema,
  temperature: z.string().trim().optional(),
  temperatureStatus: statusSchema,
  heartRate: z.string().trim().optional(),
  heartRateStatus: statusSchema,
  respiratoryRate: z.string().trim().optional(),
  respiratoryRateStatus: statusSchema,
  observations: stringArraySchema.optional(),
  clinicalNotes: z.string().trim().optional(),
};

const normalizeRecordType = (value: unknown): HealthRecordType | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("tick")) return "tick_flea";
  if (normalized.includes("flea")) return "tick_flea";
  return normalized.replace(/\s+/g, "_") as HealthRecordType;
};

const requireFullHealthRecord = (value: any, ctx: z.RefinementCtx) => {
  const details = (value.recordDetails || {}) as z.infer<typeof recordDetailsSchema>;
  const vet = (value.veterinarian || {}) as z.infer<typeof veterinarianSchema>;
  const vitals = (value.vitalSigns || {}) as z.infer<typeof vitalSignsSchema>;
  const obs = (value.observation || {}) as z.infer<typeof observationSchema>;
  const reminder = details.reminder as { enabled?: boolean; offset?: string } | undefined;

  const batchLotNo = value.batchNumber || details.batchLotNo || "";
  const otherInfo = value.otherInfo || details.otherInfo || "";
  const cost = value.cost || details.cost || "";
  const date = value.date || details.date || "";
  const nextDueDate = value.nextDueDate || details.nextDueDate || "";
  const reminderEnabled =
    value.reminderEnabled !== undefined ? value.reminderEnabled : reminder?.enabled;
  const reminderDuration = value.reminderDuration || reminder?.offset || "";

  const designation = value.vetDesignation || vet.designation || "";
  const vetName = value.vetName || vet.name || "";
  const clinicName = value.clinicName || vet.clinicName || "";
  const licenseNumber = value.licenseNumber || vet.licenseNo || "";
  const vetContact = value.vetContact || vet.contact || "";

  const weight = value.weight || vitals.weight || "";
  const temperature = value.temperature || vitals.temperature || "";
  const heartRate = value.heartRate || vitals.heartRate || "";
  const respiratoryRate = value.respiratoryRate || vitals.respiratoryRate || vitals.respiratory || "";
  const weightStatus = value.weightStatus || vitals.weightStatus || "";
  const temperatureStatus = value.temperatureStatus || vitals.temperatureStatus || "";
  const heartRateStatus = value.heartRateStatus || vitals.heartRateStatus || "";
  const respiratoryRateStatus =
    value.respiratoryRateStatus || vitals.respiratoryRateStatus || "";

  const observations = value.observations || obs.lookupObservations || [];
  const clinicalNotes = value.clinicalNotes || obs.clinicalNotes || "";

  const requireText = (field: string, message: string) => {
    if (!field.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  };

  requireText(String(value.recordName || details.recordName || ""), "Record name is required");
  requireText(batchLotNo, "Batch/Lot No. is required");
  requireText(otherInfo, "Other info is required");
  requireText(cost, "Cost is required");
  requireText(date, "Date is required");
  requireText(nextDueDate, "Next due date is required");

  if (reminderEnabled === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Reminder is required" });
  } else if (reminderEnabled && !reminderDuration.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Reminder offset is required" });
  }

  requireText(designation, "Designation is required");
  requireText(vetName, "Veterinarian name is required");
  requireText(clinicName, "Clinic name is required");
  requireText(licenseNumber, "License no. is required");
  requireText(vetContact, "Contact is required");

  requireText(weight, "Weight is required");
  requireText(temperature, "Temperature is required");
  requireText(heartRate, "Heart rate is required");
  requireText(respiratoryRate, "Respiratory rate is required");
  requireText(String(weightStatus || ""), "Weight status is required");
  requireText(String(temperatureStatus || ""), "Temperature status is required");
  requireText(String(heartRateStatus || ""), "Heart rate status is required");
  requireText(String(respiratoryRateStatus || ""), "Respiratory rate status is required");

  if (!Array.isArray(observations) || observations.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Observation is required" });
  }
  requireText(clinicalNotes, "Clinical notes are required");
};

const requireRecordName = (value: any, ctx: z.RefinementCtx) => {
  const name = value.recordName || value.recordDetails?.recordName || "";
  if (!String(name).trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Record name is required" });
  }
};

const createTypedHealthRecordSchema = (type: HealthRecordType, requireFull: boolean) =>
  z
    .object({
      type: z.literal(type).optional().default(type),
      ...baseHealthRecordSchema,
      ...flatHealthRecordSchema,
    })
    .passthrough()
    .superRefine((value, ctx) => {
      requireRecordName(value, ctx);
      if (!requireFull) return;
      requireFullHealthRecord(value, ctx);
    });

export const createPetSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  type: petTypeSchema.optional(),
  species: petTypeSchema.optional(),
  breed: z.string().trim().optional(),
  age: nonNegativeNumber("Age must be zero or positive").optional(),
  weightLbs: nonNegativeNumber("Weight must be zero or positive").optional(),
  gender: z.enum(["male", "female"]).optional(),
  trained: yesNoBooleanSchema.optional(),
  vaccinated: yesNoBooleanSchema.optional(),
  neutered: yesNoBooleanSchema.optional(),
  personality: personalitySchema.optional(),
  about: bioSchema.optional(),
  bio: bioSchema.optional(),
  photos: z.array(photoUrlSchema).optional(),
  avatarUrl: avatarUrlSchema.optional(),
}).superRefine((value, ctx) => {
  if (!value.species && !value.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pet type is required",
      path: ["type"],
    });
  }
});

export const updatePetSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  type: petTypeSchema.optional(),
  species: petTypeSchema.optional(),
  breed: z.string().trim().optional(),
  age: nonNegativeNumber("Age must be zero or positive").optional(),
  weightLbs: nonNegativeNumber("Weight must be zero or positive").optional(),
  gender: z.enum(["male", "female"]).optional(),
  trained: yesNoBooleanSchema.optional(),
  vaccinated: yesNoBooleanSchema.optional(),
  neutered: yesNoBooleanSchema.optional(),
  personality: personalitySchema.optional(),
  about: bioSchema.optional(),
  bio: bioSchema.optional(),
  photos: z.array(photoUrlSchema).optional(),
  avatarUrl: avatarUrlSchema.optional(),
  keepPhotos: stringArraySchema.optional(),
  deletePhotos: stringArraySchema.optional(),
});

export const petIdParamSchema = z.object({
  id: z.string().trim().min(1, "Pet id is required"),
});

export const petHealthRecordParamSchema = z.object({
  id: z.string().trim().min(1, "Pet id is required"),
  recordId: z.string().trim().min(1, "Record id is required"),
});

export const createHealthRecordSchema = z
  .object({
    type: healthRecordTypeSchema.optional(),
    ...baseHealthRecordSchema,
    ...flatHealthRecordSchema,
  })
  .passthrough()
  .superRefine((value, ctx) => {
    const type = normalizeRecordType(value.type || value.recordType);
    if (!type) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Record type is required" });
      return;
    }
    requireRecordName(value, ctx);
    if (type !== "vaccination" && type !== "checkup") return;
    requireFullHealthRecord(value, ctx);
  });

export const updateHealthRecordSchema = z
  .object({
    type: healthRecordTypeSchema.optional(),
    ...baseHealthRecordSchema,
    ...flatHealthRecordSchema,
    deleteAttachments: stringArraySchema.optional(),
  })
  .passthrough();

export const healthRecordListQuerySchema = z.object({
  type: healthRecordTypeSchema.optional(),
});

export const createVaccinationHealthRecordSchema = createTypedHealthRecordSchema(
  "vaccination",
  true
);
export const createCheckupHealthRecordSchema = createTypedHealthRecordSchema("checkup", true);
export const createMedicationHealthRecordSchema = createTypedHealthRecordSchema(
  "medication",
  false
);
export const createTickFleaHealthRecordSchema = createTypedHealthRecordSchema(
  "tick_flea",
  false
);
export const createSurgeryHealthRecordSchema = createTypedHealthRecordSchema("surgery", false);
export const createDentalHealthRecordSchema = createTypedHealthRecordSchema("dental", false);
export const createOtherHealthRecordSchema = createTypedHealthRecordSchema("other", false);

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type PetIdParam = z.infer<typeof petIdParamSchema>;
export type PetHealthRecordParam = z.infer<typeof petHealthRecordParamSchema>;
export type CreateHealthRecordInput = z.infer<typeof createHealthRecordSchema>;
export type UpdateHealthRecordInput = z.infer<typeof updateHealthRecordSchema>;
export type HealthRecordListQuery = z.infer<typeof healthRecordListQuerySchema>;
