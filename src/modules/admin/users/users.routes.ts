import { NextFunction, Request, Response, Router } from "express";
import { ZodError, ZodSchema } from "zod";
import adminAuth from "../auth/admin.middleware";
import * as usersController from "./users.controller";
import { adminUserIdParamSchema } from "./users.validation";

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

router.get("/", adminAuth, usersController.listUsers);
router.get("/export", adminAuth, usersController.exportUsersCsv);
router.get("/:id", adminAuth, validateParams(adminUserIdParamSchema), usersController.getUserDetails);
router.delete("/:id", adminAuth, validateParams(adminUserIdParamSchema), usersController.deleteUser);

export default router;
