import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import {
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../validations/auth.validation";
import { AuthRequest } from "../../../middlewares/auth.middleware";
import { IUser } from "../models/user.model";

const buildUserResponse = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
});

export const register = async (
  req: Request<unknown, unknown, RegisterInput>,
  res: Response
) => {
  try {
    const { user, tokens } = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: buildUserResponse(user),
        tokens,
      },
    });
    await authService.ensureVerificationOnRegister(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(400).json({ success: false, message });
  }
};

export const login = async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  try {
    const { user, tokens } = await authService.login(req.body);
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: buildUserResponse(user),
        tokens,
      },
    });
    await authService.ensureVerificationOnRegister(user);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
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
    await authService.verifyEmailWithOtp(req.body);
    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
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
    const sessionInfo = await authService.sendPhoneOtp(req.body);
    res.json({ success: true, sessionInfo });
  } catch (err) {
    res.status(400).json({ success: false, message: (err as Error).message });
  }
};

export const verifyPhoneOtpController = async (req: Request, res: Response) => {
  try {
    const { sessionInfo, phone, otp } = req.body;
    const result = await authService.verifyPhoneOtp({ sessionInfo, phone, otp });

    res.json({
      success: true,
      message: "Phone verified",
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: (err as Error).message });
  }
};