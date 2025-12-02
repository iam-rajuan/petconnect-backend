import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email format").trim(),
  password: z.string().trim().min(6, "Password must be at least 6 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10,15}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.email("Invalid email format").trim(),
  password: z.string().trim().min(6, "Password must be at least 6 characters"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(10, "Refresh token is required"),
});

export const verifyEmailSchema = z.object({
  email: z.email("Invalid email format").trim(),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
});

export const resendEmailOtpSchema = z.object({
  email: z.email("Invalid email format").trim(),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email format").trim(),
});

export const resetPasswordSchema = z.object({
  email: z.email("Invalid email format").trim(),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
  password: z.string().trim().min(6, "Password must be at least 6 characters"),
});

export const sendPhoneOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Phone must be a 10-digit US number"),
  carrier: z.enum(["verizon", "att", "tmobile", "sprint"], { message: "Carrier is required" }),
});

export const verifyPhoneOtpSchema = z.object({
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Phone must be a 10-digit US number"),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendEmailOtpInput = z.infer<typeof resendEmailOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SendPhoneOtpInput = z.infer<typeof sendPhoneOtpSchema>;
export type VerifyPhoneOtpInput = z.infer<typeof verifyPhoneOtpSchema>;
