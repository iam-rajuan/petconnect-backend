import { NextFunction, Request, Response, Router } from "express";
import { ZodError, ZodSchema, z } from "zod";
import auth from "../../middlewares/auth.middleware";
import { petIdParamSchema } from "../pets/pets.validation";
import * as uploadsController from "./uploads.controller";
import { uploadDocument, uploadMultipleImages, uploadSingleImage } from "./upload.middleware";

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

const fileIdParamSchema = z.object({
  id: z.string().trim().min(1, "Pet id is required"),
  fileId: z.string().trim().min(1, "File id is required"),
});

router.use(auth);

router.post("/user/avatar", uploadSingleImage, uploadsController.uploadUserAvatar);
router.post(
  "/pets/:id/avatar",
  validateParams(petIdParamSchema),
  uploadSingleImage,
  uploadsController.uploadPetAvatar
);
router.post(
  "/pets/:id/photos",
  validateParams(petIdParamSchema),
  uploadMultipleImages,
  uploadsController.uploadPetPhoto
);
router.post(
  "/pets/:id/documents",
  validateParams(petIdParamSchema),
  uploadDocument,
  uploadsController.uploadPetDocument
);
router.delete(
  "/pets/:id/photos/:fileId",
  validateParams(fileIdParamSchema),
  uploadsController.deletePetPhoto
);
router.delete(
  "/pets/:id/documents/:fileId",
  validateParams(fileIdParamSchema),
  uploadsController.deletePetDocument
);

export default router;
