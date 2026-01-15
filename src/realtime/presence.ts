const onlineCounts = new Map<string, number>();

export const markOnline = (userId: string) => {
  if (!userId) return;
  const count = onlineCounts.get(userId) || 0;
  onlineCounts.set(userId, count + 1);
};

export const markOffline = (userId: string): boolean => {
  if (!userId) return false;
  const count = (onlineCounts.get(userId) || 0) - 1;
  if (count <= 0) {
    onlineCounts.delete(userId);
    return true;
  } else {
    onlineCounts.set(userId, count);
  }
  return false;
};

export const isUserOnline = (userId: string) => onlineCounts.has(userId);
