const { z } = require("zod");

exports.registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),

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

  password: z
    .string()
    .trim()
    .min(6, "Password must be at least 6 characters"),
});

exports.loginSchema = z.object({
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

  password: z.string().trim().min(6, "Password must be at least 6 characters"),
});
