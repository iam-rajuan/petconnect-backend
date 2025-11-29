import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { LoginInput, RegisterInput, RefreshTokenInput } from "../validations/auth.validation";
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
