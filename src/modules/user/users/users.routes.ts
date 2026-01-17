import { NextFunction, Request, Response, Router } from "express";
import auth from "../../../middlewares/auth.middleware";
import validate from "../../../middlewares/validate.middleware";
import { ZodError, ZodSchema } from "zod";
import {
  updateProfileSchema,
  changePasswordSchema,
  updateAvatarSchema,
  updateCoverSchema,
  userIdParamSchema,
  userSearchQuerySchema,
} from "./users.validation";
import * as usersController from "./users.controller";

const router = Router();

const validateParams =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.params);
      req.params = parsed as typeof req.params;
      next();
    } catch (err) {
      const isZodError = err instanceof ZodError;
      return res.status(400).json({
        success: false,
        message: isZodError
          ? err.issues?.[0]?.message || "Validation failed"
          : "Validation failed",
        issues: isZodError ? err.issues : err,
      });
    }
  };

const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const cleaned = Object.fromEntries(
      Object.entries(req.query || {}).flatMap(([key, value]) => {
        const v = Array.isArray(value) ? value[0] : value;
        return v === "" || v === undefined || v === null ? [] : [[key, v]];
      })
    );

    try {
      const parsed = schema.parse(cleaned);
      (req as Request & { validatedQuery?: unknown }).validatedQuery = parsed;
      next();
    } catch (err) {
      const isZodError = err instanceof ZodError;
      return res.status(400).json({
        success: false,
        message: isZodError
          ? err.issues?.[0]?.message || "Validation failed"
          : "Validation failed",
        issues: isZodError ? err.issues : err,
      });
    }
  };

router.use(auth);

router.get("/me", usersController.getMe);
router.get("/search", validateQuery(userSearchQuerySchema), usersController.searchUsers);
router.get("/:id", validateParams(userIdParamSchema), usersController.getUserById);
router.patch("/me", validate(updateProfileSchema), usersController.updateMe);
router.patch("/me/password", validate(changePasswordSchema), usersController.changePassword);
router.patch("/me/avatar", validate(updateAvatarSchema), usersController.updateAvatar);
router.patch("/me/cover", validate(updateCoverSchema), usersController.updateCover);
router.post("/me/delete-request", usersController.requestDeletion);
router.post("/me/delete-request/withdraw", usersController.withdrawDeletion);

export default router;

