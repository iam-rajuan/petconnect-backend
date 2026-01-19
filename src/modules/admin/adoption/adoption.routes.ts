import { NextFunction, Request, Response, Router } from "express";
import { ZodError, ZodSchema } from "zod";
import adminAuth from "../auth/admin.middleware";
import validate from "../../../middlewares/validate.middleware";
import * as adoptionController from "./adoption.controller";
import {
  adoptionIdParamSchema,
  adoptionListQuerySchema,
  adoptionRequestQuerySchema,
  updateAdoptionRequestStatusSchema,
  updateAdoptionStatusSchema,
} from "./adoption.validation";
import { uploadAdoptionMedia, uploadHealthRecordFiles } from "./adoption.upload";

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

const maybeUploadHealthFiles = (req: Request, res: Response, next: NextFunction) => {
  if (req.is("multipart/form-data")) {
    return uploadHealthRecordFiles(req, res, next);
  }
  return next();
};

router.use(adminAuth);

router.get(
  "/requests",
  validateQuery(adoptionRequestQuerySchema),
  adoptionController.listAdoptionRequests
);
router.get(
  "/requests/:id",
  validateParams(adoptionIdParamSchema),
  adoptionController.getAdoptionRequest
);
router.patch(
  "/requests/:id/status",
  validateParams(adoptionIdParamSchema),
  validate(updateAdoptionRequestStatusSchema),
  adoptionController.updateAdoptionRequestStatus
);
router.delete(
  "/requests/:id",
  validateParams(adoptionIdParamSchema),
  adoptionController.deleteAdoptionRequest
);

router.get("/", validateQuery(adoptionListQuerySchema), adoptionController.listAdoptions);
router.get(
  "/summary",
  validateQuery(adoptionListQuerySchema),
  adoptionController.listAdoptionSummary
);
router.post("/", uploadAdoptionMedia, adoptionController.createAdoption);
router.get("/:id", validateParams(adoptionIdParamSchema), adoptionController.getAdoption);
router.get(
  "/:id/health-records",
  validateParams(adoptionIdParamSchema),
  adoptionController.listHealthRecords
);
router.post(
  "/:id/health-records",
  validateParams(adoptionIdParamSchema),
  maybeUploadHealthFiles,
  adoptionController.addHealthRecord
);
router.delete(
  "/:id/health-records/:recordId",
  adoptionController.deleteHealthRecord
);
router.patch(
  "/:id/status",
  validateParams(adoptionIdParamSchema),
  validate(updateAdoptionStatusSchema),
  adoptionController.updateAdoptionStatus
);
router.patch("/:id", validateParams(adoptionIdParamSchema), adoptionController.updateAdoption);
router.delete("/:id", validateParams(adoptionIdParamSchema), adoptionController.deleteAdoption);

export default router;
