import { z } from "zod";
import { AdoptionStatus } from "./adoption.model";

export const createAdoptionListingSchema = z.object({
  petId: z.string().trim().min(1, "Pet id is required"),
  title: z.string().trim().min(3, "Title must be at least 3 characters"),
  description: z.string().trim().optional(),
  location: z.string().trim().min(2, "Location is required"),

  contactName: z.string().trim().optional(),
  contactEmail: z.string().trim().email("Invalid email").optional(),
  contactPhone: z.string().trim().optional(),
});

export const listingIdParamSchema = z.object({
  id: z.string().trim().min(1, "Listing id is required"),
});

export const updateAdoptionStatusSchema = z.object({
  status: z.enum(["available", "pending", "adopted"]),
});

// Query filters for listing endpoint
export const listingQuerySchema = z.object({
  species: z.string().trim().optional(),
  breed: z.string().trim().optional(),
  location: z.string().trim().optional(),
  status: z.enum(["available", "pending", "adopted", "all"]).optional(),
  ageMin: z.coerce.number().min(0).optional(),
  ageMax: z.coerce.number().min(0).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

export const basketItemSchema = z.object({
  listingId: z.string().trim().min(1, "Listing id is required"),
});

export const checkoutSchema = z.object({
  listingIds: z.array(z.string().trim().min(1)).min(1, "At least one listing is required"),
  customer: z.object({
    name: z.string().trim().min(1, "Customer name is required"),
    address: z.string().trim().min(1, "Customer address is required"),
    phone: z.string().trim().min(1, "Customer phone is required"),
  }),
});

export type CreateAdoptionListingInput = z.infer<typeof createAdoptionListingSchema>;
export type UpdateAdoptionStatusInput = z.infer<typeof updateAdoptionStatusSchema>;
export type ListingIdParam = z.infer<typeof listingIdParamSchema>;
export type ListingQueryInput = z.infer<typeof listingQuerySchema>;
export type BasketItemInput = z.infer<typeof basketItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
