import { z } from "zod";

const favoritesSchema = z.preprocess((value) => {
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
}, z.array(z.string().trim()).max(20, "Too many favorites"));

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  bio: z.string().trim().max(500, "Bio must be at most 500 characters").optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, "Phone must be 10 to 15 digits")
    .optional(),
  address: z.string().trim().max(200, "Address must be at most 200 characters").optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  favorites: favoritesSchema.default([]).optional(),
  location: z
    .object({
      city: z.string().trim().optional(),
      country: z.string().trim().optional(),
    })
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().trim().min(1, "Current password is required"),
  newPassword: z.string().trim().min(6, "New password must be at least 6 characters"),
});

export const updateAvatarSchema = z.object({
  avatarUrl: z.string().trim().url("Invalid avatar URL"),
});

export const updateCoverSchema = z.object({
  coverUrl: z.string().trim().url("Invalid cover URL"),
});

export const userIdParamSchema = z.object({
  id: z.string().trim().min(1, "User id is required"),
});

export const userSearchQuerySchema = z.object({
  query: z.string().trim().min(1, "Search query is required"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;
export type UpdateCoverInput = z.infer<typeof updateCoverSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
