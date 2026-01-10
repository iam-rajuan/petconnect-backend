import { z } from "zod";

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

export const createMessageSchema = z.object({
  recipientId: z.string().trim().min(1, "Recipient id is required"),
  body: z
    .string()
    .trim()
    .min(1, "Message body is required")
    .max(2000, "Message must be at most 2000 characters"),
});

export const messageQuerySchema = z.object({
  page: z.preprocess(toNumber, z.number().int().min(1).default(1)),
  limit: z.preprocess(toNumber, z.number().int().min(1).max(100).default(20)),
});

export const conversationIdParamSchema = z.object({
  id: z.string().trim().min(1, "Conversation id is required"),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type MessageQuery = z.infer<typeof messageQuerySchema>;
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>;
