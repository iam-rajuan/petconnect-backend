import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import validate from "../../../middlewares/validate.middleware";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/auth.validation";
import auth from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

import { sendPhoneOtpSchema, verifyPhoneOtpSchema } from "../validations/auth.validation";
import { sendPhoneOtpController, verifyPhoneOtpController } from "../controllers/auth.controller";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshTokenSchema), authController.refresh);
router.post("/logout", validate(refreshTokenSchema), authController.logout);
router.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);
router.get("/me", auth, authController.me);
router.get("/admin-test", auth, requireRole("admin"), authController.adminTest);



// Send OTP
router.post("/phone/send-otp", validate(sendPhoneOtpSchema), sendPhoneOtpController);

// Verify OTP & Login
router.post("/phone/verify-otp", validate(verifyPhoneOtpSchema), verifyPhoneOtpController);

export default router;
