import { z } from "zod";

export const adminUserIdParamSchema = z.object({
  id: z.string().trim().min(1, "User id is required"),
});

export type AdminUserIdParam = z.infer<typeof adminUserIdParamSchema>;
