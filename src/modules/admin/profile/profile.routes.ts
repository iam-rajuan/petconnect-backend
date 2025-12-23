import { Router } from "express";
import validate from "../../../middlewares/validate.middleware";
import adminAuth from "../auth/admin.middleware";
import * as profileController from "./profile.controller";
import { changePasswordSchema, updateProfileSchema } from "./profile.validation";

const router = Router();

router.get("/", adminAuth, profileController.getProfile);
router.patch("/", adminAuth, validate(updateProfileSchema), profileController.updateProfile);
router.patch("/password", adminAuth, validate(changePasswordSchema), profileController.changePassword);

export default router;
