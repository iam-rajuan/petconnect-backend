import { Router, Request, Response, NextFunction } from "express";
import auth from "../../../middlewares/auth.middleware";
import validate from "../../../middlewares/validate.middleware";
import {
  createHealthRecordSchema,
  createCheckupHealthRecordSchema,
  createDentalHealthRecordSchema,
  createMedicationHealthRecordSchema,
  createOtherHealthRecordSchema,
  createSurgeryHealthRecordSchema,
  createTickFleaHealthRecordSchema,
  createVaccinationHealthRecordSchema,
  createPetSchema,
  healthRecordListQuerySchema,
  petHealthRecordParamSchema,
  petIdParamSchema,
  updateHealthRecordSchema,
  updatePetSchema,
} from "./pets.validation";
import * as petsController from "./pets.controller";
import { ZodError, ZodSchema } from "zod";
import {
  uploadPetCreateMedia,
  uploadPetHealthFiles,
  uploadPetHealthRecord,
} from "../uploads/upload.middleware";

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

const maybeUploadHealthFiles = (req: Request, res: Response, next: NextFunction) =>
  uploadPetHealthRecord(req, res, next);

router.use(auth);

router.post("/", uploadPetCreateMedia, validate(createPetSchema), petsController.createPet);
router.get("/", petsController.getMyPets);
router.get("/:id", validateParams(petIdParamSchema), petsController.getPetById);
router.patch(
  "/:id",
  validateParams(petIdParamSchema),
  uploadPetCreateMedia,
  validate(updatePetSchema),
  petsController.updatePet
);
router.get(
  "/:id/health-records",
  validateParams(petIdParamSchema),
  validateQuery(healthRecordListQuerySchema),
  petsController.listHealthRecords
);
router.post(
  "/:id/health-records",
  validateParams(petIdParamSchema),
  maybeUploadHealthFiles,
  validate(createHealthRecordSchema),
  petsController.addHealthRecord
);
router.post(
  "/:id/health-records/vaccination",
  validateParams(petIdParamSchema),
  maybeUploadHealthFiles,
  validate(createVaccinationHealthRecordSchema),
  petsController.addVaccinationHealthRecord
);
router.post(
  "/:id/health-records/checkup",
  validateParams(petIdParamSchema),
  maybeUploadHealthFiles,
  validate(createCheckupHealthRecordSchema),
  petsController.addCheckupHealthRecord
);
router.post(
  "/:id/health-records/medication",
  validateParams(petIdParamSchema),
  maybeUploadHealthFiles,
  validate(createMedicationHealthRecordSchema),
  petsController.addMedicationHealthRecord
);
router.post(
  "/:id/health-records/tick-flea",
  validateParams(petIdParamSchema),
  maybeUploadHealthFiles,
  validate(createTickFleaHealthRecordSchema),
  petsController.addTickFleaHealthRecord
);
router.post(
  "/:id/health-records/surgery",
  validateParams(petIdParamSchema),
  maybeUploadHealthFiles,
  validate(createSurgeryHealthRecordSchema),
  petsController.addSurgeryHealthRecord
);
router.post(
  "/:id/health-records/dental",
  validateParams(petIdParamSchema),
  maybeUploadHealthFiles,
  validate(createDentalHealthRecordSchema),
  petsController.addDentalHealthRecord
);
router.post(
  "/:id/health-records/other",
  validateParams(petIdParamSchema),
  maybeUploadHealthFiles,
  validate(createOtherHealthRecordSchema),
  petsController.addOtherHealthRecord
);
router.delete(
  "/:id/health-records/:recordId",
  validateParams(petHealthRecordParamSchema),
  petsController.deleteHealthRecord
);
router.patch(
  "/:id/health-records/:recordId",
  validateParams(petHealthRecordParamSchema),
  maybeUploadHealthFiles,
  validate(updateHealthRecordSchema),
  petsController.updateHealthRecord
);
router.delete("/:id", validateParams(petIdParamSchema), petsController.deletePet);

export default router;
