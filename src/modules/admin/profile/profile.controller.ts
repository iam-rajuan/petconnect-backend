import { Response } from "express";
import { AuthRequest } from "../../../middlewares/auth.middleware";
import * as profileService from "./profile.service";
import { ChangePasswordInput, UpdateProfileInput } from "./profile.validation";

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const profile = await profileService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch profile";
    res.status(400).json({ success: false, message });
  }
};

export const updateProfile = async (
  req: AuthRequest & { body: UpdateProfileInput },
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const profile = await profileService.updateProfile(req.user.id, req.body);
    res.json({ success: true, message: "Profile updated", data: profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    res.status(400).json({ success: false, message });
  }
};


export const changePassword = async (
  req: AuthRequest & { body: ChangePasswordInput },
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    await profileService.changePassword(req.user.id, req.body);
    res.json({ success: true, message: "Password changed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to change password";
    res.status(400).json({ success: false, message });
  }
};
