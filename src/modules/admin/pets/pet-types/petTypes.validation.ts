import { z } from "zod";

export const petTypeIdParamSchema = z.object({
  id: z.string().trim().min(1, "Pet type id is required"),
});

export const createPetTypeSchema = z.object({
  name: z.string().trim().min(2, "Pet type name is required").max(30, "Max 30 characters"),
});

export const updatePetTypeSchema = z.object({
  name: z.string().trim().min(2, "Pet type name is required").max(30, "Max 30 characters"),
});

export const updatePetBreedsSchema = z.object({
  breeds: z
    .array(z.string().trim().min(1, "Pet breed name is required"))
    .max(200, "Too many pet breeds"),
});

export type CreatePetTypeInput = z.infer<typeof createPetTypeSchema>;
export type UpdatePetTypeInput = z.infer<typeof updatePetTypeSchema>;
export type UpdatePetBreedsInput = z.infer<typeof updatePetBreedsSchema>;
export type PetTypeIdParam = z.infer<typeof petTypeIdParamSchema>;
