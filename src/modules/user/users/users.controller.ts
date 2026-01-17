import { Request, Response } from "express";
import { AuthRequest } from "../../../middlewares/auth.middleware";
import * as usersService from "./users.service";
import { toUserProfileResponse } from "./users.mapper";
import * as communityService from "../community/community.service";

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await usersService.getOwnProfile(req.user.id);
    res.json({
      success: true,
      data: toUserProfileResponse(user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch profile";
    res.status(400).json({ success: false, message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    res.json({
      success: true,
      data: toUserProfileResponse(user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "User not found";
    const status = message === "User not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await usersService.updateOwnProfile(req.user.id, req.body);
    res.json({
      success: true,
      message: "Profile updated",
      data: toUserProfileResponse(user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    res.status(400).json({ success: false, message });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    await usersService.changeOwnPassword(req.user.id, req.body);
    res.json({
      success: true,
      message: "Password changed",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to change password";
    res.status(400).json({ success: false, message });
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await usersService.updateOwnAvatar(req.user.id, req.body);
    if (user.avatarUrl) {
      try {
        await communityService.createProfileUpdatePost(req.user.id, user.avatarUrl);
      } catch (err) {
        // Ignore post creation failures for avatar updates.
      }
    }
    res.json({
      success: true,
      message: "Avatar updated",
      data: toUserProfileResponse(user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update avatar";
    res.status(400).json({ success: false, message });
  }
};

export const updateCover = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await usersService.updateOwnCover(req.user.id, req.body);
    if (user.coverUrl) {
      try {
        await communityService.createCoverUpdatePost(req.user.id, user.coverUrl);
      } catch (err) {
        // Ignore post creation failures for cover updates.
      }
    }
    res.json({
      success: true,
      message: "Cover updated",
      data: toUserProfileResponse(user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update cover";
    res.status(400).json({ success: false, message });
  }
};

export const requestDeletion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await usersService.requestAccountDeletion(req.user.id);
    res.json({
      success: true,
      message: "Deletion request received",
      data: {
        id: user._id,
        deletionRequestedAt: user.deletionRequestedAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to request deletion";
    res.status(400).json({ success: false, message });
  }
};

export const withdrawDeletion = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const user = await usersService.withdrawAccountDeletion(req.user.id);
    res.json({
      success: true,
      message: "Deletion request withdrawn",
      data: {
        id: user._id,
        deletionRequestedAt: user.deletionRequestedAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to withdraw deletion";
    res.status(400).json({ success: false, message });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const query =
      (req as Request & { validatedQuery?: { query?: string } }).validatedQuery || {};
    const users = await usersService.searchUsers(req.user.id, query.query || "");
    res.json({
      success: true,
      data: users.map((user) => ({
        id: String(user._id),
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
        lastSeenAt: user.lastSeenAt || null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to search users";
    res.status(400).json({ success: false, message });
  }
};

