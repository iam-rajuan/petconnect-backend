import User from "../modules/user/users/user.model";
import RefreshToken from "../modules/user/auth/refreshToken.model";

const DAY_MS = 24 * 60 * 60 * 1000;
const DELETION_WINDOW_MS = 30 * DAY_MS;

export const runUserDeletionCleanup = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - DELETION_WINDOW_MS);
  const users = await User.find({
    role: "user",
    deletionRequestedAt: { $lte: cutoff },
  }).select("_id");

  if (users.length === 0) {
    return 0;
  }

  const userIds = users.map((user) => user._id);
  await RefreshToken.deleteMany({ user: { $in: userIds } });
  const result = await User.deleteMany({ _id: { $in: userIds } });
  return result.deletedCount ?? 0;
};

export const startUserDeletionJob = (): NodeJS.Timeout => {
  const run = async () => {
    try {
      const deleted = await runUserDeletionCleanup();
      if (deleted > 0) {
        console.log(`[userDeletionJob] Deleted ${deleted} users`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[userDeletionJob] Failed to run cleanup:", message);
    }
  };

  void run();
  return setInterval(() => {
    void run();
  }, DAY_MS);
};
