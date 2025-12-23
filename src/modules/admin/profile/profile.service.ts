import bcrypt from "bcrypt";
import Admin from "../auth/admin.model";
import AdminRefreshToken from "../auth/adminRefreshToken.model";
import { ChangePasswordInput, UpdateProfileInput } from "./profile.validation";

export interface AdminProfile {
  id: string;
  name: string;
  email?: string;
}

const requireAdmin = async (adminId: string) => {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw new Error("Admin not found");
  }
  return admin;
};

export const getProfile = async (adminId: string): Promise<AdminProfile> => {
  const admin = await requireAdmin(adminId);
  return {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
  };
};

export const updateProfile = async (
  adminId: string,
  payload: UpdateProfileInput
): Promise<AdminProfile> => {
  const admin = await requireAdmin(adminId);

  if (payload.name) {
    admin.name = payload.name.trim();
  }

  if (payload.email) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (normalizedEmail !== admin.email) {
      const existing = await Admin.findOne({ email: normalizedEmail, _id: { $ne: adminId } });
      if (existing) {
        throw new Error("Email already in use");
      }
      admin.email = normalizedEmail;
    }
  }

  await admin.save();

  return {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
  };
};


export const changePassword = async (
  adminId: string,
  payload: ChangePasswordInput
): Promise<void> => {
  const admin = await requireAdmin(adminId);

  const matches = await bcrypt.compare(payload.currentPassword.trim(), admin.password);
  if (!matches) {
    throw new Error("Incorrect current password");
  }

  const hashed = await bcrypt.hash(payload.newPassword.trim(), 10);
  admin.password = hashed;
  admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
  await admin.save();

  await AdminRefreshToken.updateMany(
    { admin: admin._id, revoked: false },
    { revoked: true, revokedAt: new Date() }
  );
};
