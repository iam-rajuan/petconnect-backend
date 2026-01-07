import { z } from "zod";

const petTypeSchema = z.string().trim().min(2, "Pet type is required");
const bioSchema = z.string().trim().max(1000, "About must be at most 1000 characters");
const photoUrlSchema = z.string().trim().url("Invalid photo URL");
const avatarUrlSchema = z.string().trim().url("Invalid avatar URL");
const yesNoBooleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val) => val === true || val === "true");
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
});

export const petIdParamSchema = z.object({
  id: z.string().trim().min(1, "Pet id is required"),
});

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type PetIdParam = z.infer<typeof petIdParamSchema>;
