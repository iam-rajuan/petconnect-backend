import { Router } from "express";
import * as authController from "./auth.controller";
import validate from "../../middlewares/validate.middleware";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  resendEmailOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeProfileSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
} from "./auth.validation";
import auth, { onboardingAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshTokenSchema), authController.refresh);
router.post("/logout", validate(refreshTokenSchema), authController.logout);
router.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
router.post("/resend-email-otp", validate(resendEmailOtpSchema), authController.resendEmailOtp);
router.post(
  "/complete-profile",
  onboardingAuth,
  validate(completeProfileSchema),
  authController.completeProfile
);
router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);
router.get("/me", auth, authController.me);
router.get("/admin-test", auth, requireRole("admin"), authController.adminTest);



// Send OTP
router.post(
  "/phone/send-otp",
  validate(sendPhoneOtpSchema),
  authController.sendPhoneOtpController
);

// Verify OTP & Login
router.post(
  "/phone/verify-otp",
  validate(verifyPhoneOtpSchema),
  authController.verifyPhoneOtpController
);

export default router;
