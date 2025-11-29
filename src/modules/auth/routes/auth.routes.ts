import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import validate from "../../../middlewares/validate.middleware";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "../validations/auth.validation";
import auth from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshTokenSchema), authController.refresh);
router.post("/logout", validate(refreshTokenSchema), authController.logout);
router.get("/me", auth, authController.me);
router.get("/admin-test", auth, requireRole("admin"), authController.adminTest);

export default router;
