import { Request, Response } from "express";
import * as authService from "./auth.service";
import {
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  VerifyEmailInput,
  ResendEmailOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  CompleteProfileInput,
} from "./auth.validation";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { IUser } from "../users/user.model";

const buildUserResponse = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  username: user.username,
  avatarUrl: user.avatarUrl,
  location: user.location,
  favorites: user.favorites || [],
  isVerified: user.isVerified,
  profileCompleted: user.profileCompleted ?? true,
});

export const register = async (
  req: Request<unknown, unknown, RegisterInput>,
  res: Response
) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: "OTP sent to email. Please verify email to complete registration.",
      data: {
        email: result.email,
        phone: result.phone,
        name: result.name,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(400).json({ success: false, message });
  }
};

export const login = async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  try {
    const { user, tokens, needsProfileSetup, setupToken } = await authService.login(req.body);
    res.json({
      success: true,
      message: tokens ? "Login successful" : "Profile setup required",
      data: {
        user: buildUserResponse(user),
        tokens,
        needsProfileSetup: Boolean(needsProfileSetup),
        setupToken,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(400).json({ success: false, message });
  }
};

export const completeProfile = async (
  req: AuthRequest & Request<unknown, unknown, CompleteProfileInput>,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await authService.completeProfile(req.user.id, req.body);
    res.json({
      success: true,
      message: "Profile completed",
      data: {
        user: buildUserResponse(result.user),
        tokens: result.tokens,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile setup failed";
    res.status(400).json({ success: false, message });
  }
};

export const refresh = async (
  req: Request<unknown, unknown, RefreshTokenInput>,
  res: Response
) => {
  try {
    const tokens = await authService.refreshTokens(req.body);
    res.json({
      success: true,
      message: "Tokens refreshed",
      data: tokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refresh failed";
    res.status(400).json({ success: false, message });
  }
};

export const logout = async (
  req: Request<unknown, unknown, RefreshTokenInput>,
  res: Response
) => {
  try {
    await authService.logout(req.body);
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Logout failed";
    res.status(400).json({ success: false, message });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: "User authenticated",
    user: req.user,
  });
};

export const adminTest = async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: "Admin access granted",
    user: req.user,
  });
};

export const verifyEmail = async (
  req: Request<unknown, unknown, VerifyEmailInput>,
  res: Response
) => {
  try {
    const { user, needsProfileSetup, setupToken } = await authService.verifyEmailWithOtp(
      req.body
    );
    res.json({
      success: true,
      message: "Email verified successfully",
      data: {
        user: buildUserResponse(user),
        needsProfileSetup: Boolean(needsProfileSetup),
        setupToken,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    res.status(400).json({ success: false, message });
  }
};

export const resendEmailOtp = async (
  req: Request<unknown, unknown, ResendEmailOtpInput>,
  res: Response
) => {
  try {
    await authService.resendEmailVerificationOtp(req.body);
    res.json({
      success: true,
      message: "OTP resent to email",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resend failed";
    res.status(400).json({ success: false, message });
  }
};

export const forgotPassword = async (
  req: Request<unknown, unknown, ForgotPasswordInput>,
  res: Response
) => {
  try {
    await authService.requestPasswordReset(req.body);
    res.json({
      success: true,
      message: "If this email exists, an OTP has been sent",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    res.status(400).json({ success: false, message });
  }
};

export const resetPassword = async (
  req: Request<unknown, unknown, ResetPasswordInput>,
  res: Response
) => {
  try {
    await authService.resetPasswordWithOtp(req.body);
    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reset failed";
    res.status(400).json({ success: false, message });
  }
};




export const sendPhoneOtpController = async (req: Request, res: Response) => {
  try {
    await authService.sendPhoneOtp(req.body);
    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    res.status(400).json({ success: false, message: (err as Error).message });
  }
};

export const verifyPhoneOtpController = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;
    const { user, tokens, needsProfileSetup, setupToken } = await authService.verifyPhoneOtp({
      phone,
      otp,
    });

    res.json({
      success: true,
      message: tokens ? "Phone verified" : "Profile setup required",
      data: {
        user: buildUserResponse(user),
        tokens,
        needsProfileSetup: Boolean(needsProfileSetup),
        setupToken,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: (err as Error).message });
  }
};
