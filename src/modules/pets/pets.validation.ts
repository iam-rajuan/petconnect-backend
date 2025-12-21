import { z } from "zod";

const petTypeSchema = z.string().trim().min(2, "Pet type is required");
const bioSchema = z.string().trim().max(1000, "About must be at most 1000 characters");
const photoUrlSchema = z.string().trim().url("Invalid photo URL");
const yesNoSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "yes") return true;
    if (normalized === "no") return false;
  }
  return value;
}, z.boolean());

export const createPetSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  type: petTypeSchema.optional(),
  species: petTypeSchema.optional(),
  breed: z.string().trim().optional(),
  age: z.number().min(0, "Age must be zero or positive").optional(),
  weightLbs: z.number().min(0, "Weight must be zero or positive").optional(),
  gender: z.enum(["male", "female"]).optional(),
  trained: yesNoSchema.optional(),
  neutered: yesNoSchema.optional(),
  personality: z.array(z.string().trim().min(1)).max(5, "Max 5 personality traits").optional(),
  about: bioSchema.optional(),
  bio: bioSchema.optional(),
  photos: z.array(photoUrlSchema).optional(),
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
  age: z.number().min(0, "Age must be zero or positive").optional(),
  weightLbs: z.number().min(0, "Weight must be zero or positive").optional(),
  gender: z.enum(["male", "female"]).optional(),
  trained: yesNoSchema.optional(),
  neutered: yesNoSchema.optional(),
  personality: z.array(z.string().trim().min(1)).max(5, "Max 5 personality traits").optional(),
  about: bioSchema.optional(),
  bio: bioSchema.optional(),
  photos: z.array(photoUrlSchema).optional(),
});

export const petIdParamSchema = z.object({
  id: z.string().trim().min(1, "Pet id is required"),
});

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
export type PetIdParam = z.infer<typeof petIdParamSchema>;
