import { NextFunction, Request, Response, Router } from "express";
import { ZodError, ZodSchema } from "zod";
import adminAuth from "../auth/admin.middleware";
import validate from "../../../middlewares/validate.middleware";
import * as settingsController from "./settings.controller";
import {
  availabilitySchema,
  createServiceSchema,
  privacySchema,
  serviceIdParamSchema,
  taxSchema,
  termsSchema,
  updateServiceSchema,
  updateServicesSchema,
} from "./settings.validation";

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

router.use(adminAuth);

router.get("/services", settingsController.listServices);
router.post("/services", validate(createServiceSchema), settingsController.createService);
router.patch("/services", validate(updateServicesSchema), settingsController.updateServices);
router.patch(
  "/services/:id",
  validateParams(serviceIdParamSchema),
  validate(updateServiceSchema),
  settingsController.updateService
);
router.delete(
  "/services/:id",
  validateParams(serviceIdParamSchema),
  settingsController.deleteService
);

router.get("/tax", settingsController.getActiveTax);
router.post("/tax", validate(taxSchema), settingsController.setActiveTax);
router.patch("/tax", validate(taxSchema), settingsController.updateActiveTax);
router.get("/availability", settingsController.getAvailability);
router.patch(
  "/availability",
  validate(availabilitySchema),
  settingsController.updateAvailability
);
router.get("/terms", settingsController.getTerms);
router.put("/terms", validate(termsSchema), settingsController.updateTerms);
router.get("/privacy", settingsController.getPrivacy);
router.put("/privacy", validate(privacySchema), settingsController.updatePrivacy);

export default router;
