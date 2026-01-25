import { z } from "zod";

const toStringArray = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return undefined;
};

const optionalStringArray = z.preprocess(toStringArray, z.array(z.string().trim())).optional();
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1, "Text is required").optional()
);

export const createPostSchema = z
  .object({
    text: optionalText,
  })
  .strict();

export const updatePostSchema = z
  .object({
    text: optionalText,
    keepMedia: optionalStringArray,
    deleteMedia: optionalStringArray,
  })
  .strict();

export const createCommentSchema = z
  .object({
    text: z.string().trim().min(1, "Comment text is required"),
  })
  .strict();

export const createReplySchema = z
  .object({
    text: z.string().trim().min(1, "Reply text is required"),
  })
  .strict();

export const updateCommentSchema = z
  .object({
    text: z.string().trim().min(1, "Comment text is required"),
  })
  .strict();

export const reportPostSchema = z
  .object({
    reason: z.string().trim().min(1, "Report reason is required").optional(),
  })
  .strict();

export const sharePostSchema = z
  .object({
    text: optionalText,
  })
  .strict();

export const postIdParamSchema = z.object({
  id: z.string().trim().min(1, "Post ID is required"),
});

export const commentIdParamSchema = z.object({
  id: z.string().trim().min(1, "Comment ID is required"),
});

export const userIdParamSchema = z.object({
  id: z.string().trim().min(1, "User ID is required"),
});

export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
