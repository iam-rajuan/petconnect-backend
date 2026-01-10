import { NextFunction, Request, Response, Router } from "express";
import { ZodSchema } from "zod";
import auth from "../../../middlewares/auth.middleware";
import validate from "../../../middlewares/validate.middleware";
import * as messagesController from "./messages.controller";
import {
  conversationIdParamSchema,
  createMessageSchema,
  messageQuerySchema,
} from "./messages.validation";

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

router.get("/conversations", messagesController.listConversations);
router.get(
  "/conversations/:id/messages",
  validateParams(conversationIdParamSchema),
  validateQuery(messageQuerySchema),
  messagesController.listMessages
);
router.post("/", validate(createMessageSchema), messagesController.sendMessage);
router.post(
  "/conversations/:id/read",
  validateParams(conversationIdParamSchema),
  messagesController.markConversationRead
);

export default router;
