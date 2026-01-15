import { NextFunction, Request, Response, Router } from "express";
import { ZodSchema } from "zod";
import auth from "../../../middlewares/auth.middleware";
import validate from "../../../middlewares/validate.middleware";
import * as messagesController from "./messages.controller";
import {
  conversationIdParamSchema,
  conversationListQuerySchema,
  createMessageSchema,
  createMessageWithAttachmentsSchema,
  messageIdParamSchema,
  messageQuerySchema,
  updateMessageSchema,
  userIdParamSchema,
  userSearchQuerySchema,
} from "./messages.validation";
import { uploadMessageAttachments } from "../uploads/upload.middleware";

const router = Router();

const validateParams =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const issues = result.error.issues;
      return res.status(400).json({
        success: false,
        message: issues?.[0]?.message || "Validation failed",
        issues,
      });
    }
    req.params = result.data as typeof req.params;
    next();
  };

const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const cleaned = Object.fromEntries(
      Object.entries(req.query || {}).flatMap(([key, value]) => {
        const v = Array.isArray(value) ? value[0] : value;
        return v === "" || v === undefined || v === null ? [] : [[key, v]];
      })
    );

    const result = schema.safeParse(cleaned);
    if (!result.success) {
      const issues = result.error.issues;
      return res.status(400).json({
        success: false,
        message: issues?.[0]?.message || "Validation failed",
        issues,
      });
    }

    (req as Request & { validatedQuery?: unknown }).validatedQuery = result.data;
    next();
  };

router.use(auth);

router.get(
  "/conversations",
  validateQuery(conversationListQuerySchema),
  messagesController.listConversations
);
router.get(
  "/conversations/:id/messages",
  validateParams(conversationIdParamSchema),
  validateQuery(messageQuerySchema),
  messagesController.listMessages
);
router.post("/", validate(createMessageSchema), messagesController.sendMessage);
router.post(
  "/attachments",
  uploadMessageAttachments,
  validate(createMessageWithAttachmentsSchema),
  messagesController.sendMessageWithAttachments
);
router.post(
  "/conversations/:id/read",
  validateParams(conversationIdParamSchema),
  messagesController.markConversationRead
);
router.get(
  "/users/search",
  validateQuery(userSearchQuerySchema),
  messagesController.searchUsers
);
router.post(
  "/block/:id",
  validateParams(userIdParamSchema),
  messagesController.blockUser
);
router.delete(
  "/block/:id",
  validateParams(userIdParamSchema),
  messagesController.unblockUser
);
router.patch(
  "/:id",
  validateParams(messageIdParamSchema),
  validate(updateMessageSchema),
  messagesController.updateMessage
);
router.delete(
  "/:id",
  validateParams(messageIdParamSchema),
  messagesController.deleteMessage
);

export default router;
