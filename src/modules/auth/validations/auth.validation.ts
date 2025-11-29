import { z } from "zod";

const contactSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
});

export const registerSchema = contactSchema
  .extend({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    password: z.string().trim().min(6, "Password must be at least 6 characters"),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email or phone must be provided",
        path: ["email"],
      });
    }
  });

export const loginSchema = contactSchema
  .extend({
    password: z.string().trim().min(6, "Password must be at least 6 characters"),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email or phone must be provided",
        path: ["email"],
      });
    }
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(10, "Refresh token is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
