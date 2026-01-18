import { NextFunction, Request, Response, Router } from "express";
import validate from "../../../middlewares/validate.middleware";
import adminAuth from "../auth/admin.middleware";
import * as petTypesController from "./pet-types/petTypes.controller";
import * as petBreedsController from "./pet-breeds/petBreeds.controller";
import {
  createPetTypeSchema,
  updatePetTypeSchema,
  petTypeIdParamSchema,
  updatePetBreedsSchema,
} from "./pet-types/petTypes.validation";
import {
  createPetBreedSchema,
  updatePetBreedSchema,
  petBreedIdParamSchema,
  petTypeIdParamSchema as petTypeIdParamSchemaForBreed,
} from "./pet-breeds/petBreeds.validation";
import { ZodError, ZodSchema } from "zod";

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

router.post(
  "/pet-types",
  adminAuth,
  validate(createPetTypeSchema),
  petTypesController.createPetType
);
router.get("/pet-types", adminAuth, petTypesController.listPetTypes);
router.patch(
  "/pet-types/:id",
  adminAuth,
  validateParams(petTypeIdParamSchema),
  validate(updatePetTypeSchema),
  petTypesController.updatePetType
);
router.patch(
  "/pet-types/:id/breeds",
  adminAuth,
  validateParams(petTypeIdParamSchema),
  validate(updatePetBreedsSchema),
  petTypesController.updatePetBreeds
);
router.delete(
  "/pet-types/:id",
  adminAuth,
  validateParams(petTypeIdParamSchema),
  petTypesController.deletePetType
);

router.post(
  "/pet-types/:typeId/breeds",
  adminAuth,
  validateParams(petTypeIdParamSchemaForBreed),
  validate(createPetBreedSchema),
  petBreedsController.createPetBreed
);
router.get(
  "/pet-types/:typeId/breeds",
  adminAuth,
  validateParams(petTypeIdParamSchemaForBreed),
  petBreedsController.listBreedsByType
);
router.patch(
  "/pet-breeds/:id",
  adminAuth,
  validateParams(petBreedIdParamSchema),
  validate(updatePetBreedSchema),
  petBreedsController.updatePetBreed
);
router.delete(
  "/pet-breeds/:id",
  adminAuth,
  validateParams(petBreedIdParamSchema),
  petBreedsController.deletePetBreed
);

export default router;
