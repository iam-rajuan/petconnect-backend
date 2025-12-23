import { IUser } from "../../user/users/user.model";

const DAY_MS = 24 * 60 * 60 * 1000;
const DELETION_WINDOW_DAYS = 30;

type DeletionInfo = {
  status: "active" | "deletion_request";
  deletionRequestedAt: Date | null | undefined;
  daysLeft: number | null;
};

const buildDeletionInfo = (user: IUser): DeletionInfo => {
  if (!user.deletionRequestedAt) {
    return {
      status: "active",
      deletionRequestedAt: null,
      daysLeft: null,
    };
  }

  const deadline = new Date(
    user.deletionRequestedAt.getTime() + DELETION_WINDOW_DAYS * DAY_MS
  );
  const msLeft = deadline.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS));

  return {
    status: "deletion_request",
    deletionRequestedAt: user.deletionRequestedAt,
    daysLeft,
  };
};

export const toAdminUserSummary = (user: IUser) => {
  const deletionInfo = buildDeletionInfo(user);
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    status: deletionInfo.status,
    deletionRequestedAt: deletionInfo.deletionRequestedAt,
    daysLeft: deletionInfo.daysLeft,
    createdAt: user.createdAt,
  };
};

export const toAdminUserDetails = (user: IUser) => {
  const deletionInfo = buildDeletionInfo(user);
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    status: deletionInfo.status,
    deletionRequestedAt: deletionInfo.deletionRequestedAt,
    daysLeft: deletionInfo.daysLeft,
    isVerified: user.isVerified,
    isPhoneVerified: user.isPhoneVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
