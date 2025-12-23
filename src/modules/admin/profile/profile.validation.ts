import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  email: z.email("Invalid email format").trim().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;


export const changePasswordSchema = z.object({
  currentPassword: z.string().trim().min(1, "Current password is required"),
  newPassword: z.string().trim().min(6, "New password must be at least 6 characters"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
