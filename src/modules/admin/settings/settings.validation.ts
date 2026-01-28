import { z } from "zod";
import { ServiceType } from "../../services/serviceCatalog.model";


//type must be one of: vet, grooming, training, walking
export const createServiceSchema = z.object({
  name: z.string().trim().min(2, "Service name is required"),
  type: z.enum(["vet", "grooming", "training", "walking"] as [ServiceType, ...ServiceType[]]),
  price: z.number().min(0, "Price must be zero or greater"),
  isActive: z.boolean().optional(),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(2).optional(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateServicesSchema = z.object({
  services: z
    .array(
      z.object({
        name: z.string().trim().min(2, "Service name is required"),
        type: z.enum(["vet", "grooming", "training", "walking"] as [
          ServiceType,
          ...ServiceType[],
        ]),
        price: z.number().min(0, "Price must be zero or greater"),
        isActive: z.boolean().optional(),
      })
    )
    .min(1, "At least one service is required"),
});

export const serviceIdParamSchema = z.object({
  id: z.string().trim().min(1, "Service id is required"),
});

export const taxSchema = z.object({
  percent: z.number().min(0, "Tax must be >= 0").max(100, "Tax must be <= 100"),
});

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const availabilitySchema = z.object({
  startTime: z.string().trim().regex(timeRegex, "Start time must be HH:mm"),
  endTime: z.string().trim().regex(timeRegex, "End time must be HH:mm"),
  slotMinutes: z.number().int().min(5, "Slot minutes must be >= 5").max(240),
});

export const termsSchema = z.object({
  content: z.string().trim().min(1, "Terms content is required"),
});

export const privacySchema = z.object({
  content: z.string().trim().min(1, "Privacy policy content is required"),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type UpdateServicesInput = z.infer<typeof updateServicesSchema>;
export type ServiceIdParam = z.infer<typeof serviceIdParamSchema>;
export type TaxInput = z.infer<typeof taxSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type TermsInput = z.infer<typeof termsSchema>;
export type PrivacyInput = z.infer<typeof privacySchema>;
