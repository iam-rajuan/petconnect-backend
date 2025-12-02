import bcrypt from "bcrypt";
import User, { IUser } from "../auth/models/user.model";
import RefreshToken from "../auth/models/refreshToken.model";
import {
  UpdateProfileInput,
  ChangePasswordInput,
  UpdateAvatarInput,
} from "./users.validation";

export const getOwnProfile = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

export const updateOwnProfile = async (
  userId: string,
  payload: UpdateProfileInput
): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const nextPhone = payload.phone?.trim();
  if (nextPhone && nextPhone !== user.phone) {
    const existingPhoneUser = await User.findOne({ phone: nextPhone, _id: { $ne: userId } });
    if (existingPhoneUser) {
      throw new Error("Phone already in use");
    }
    user.phone = nextPhone;
    user.isPhoneVerified = false;
  }

  if (payload.name) {
    user.name = payload.name.trim();
  }

  if (payload.bio !== undefined) {
    user.bio = payload.bio.trim();
  }

  if (payload.location) {
    user.location = {
      city: payload.location.city?.trim() || "",
      country: payload.location.country?.trim() || "",
    };
  }

  await user.save();
  return user;
};

export const changeOwnPassword = async (
  userId: string,
  payload: ChangePasswordInput
): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const hasPassword = !!user.password;
  if (!hasPassword) {
    throw new Error("Incorrect current password");
  }

  const matches = await bcrypt.compare(payload.currentPassword.trim(), user.password);
  if (!matches) {
    throw new Error("Incorrect current password");
  }

  const hashed = await bcrypt.hash(payload.newPassword.trim(), 10);
  user.password = hashed;
  await user.save();

  await RefreshToken.updateMany(
    { user: userId, revoked: false },
    { revoked: true, revokedAt: new Date() }
  );
};

export const updateOwnAvatar = async (
  userId: string,
  payload: UpdateAvatarInput
): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  user.avatarUrl = payload.avatarUrl.trim();
  await user.save();
  return user;
};

export const updateUserAvatar = async (userId: string, avatarUrl: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  user.avatarUrl = avatarUrl.trim();
  await user.save();
  return user;
};
