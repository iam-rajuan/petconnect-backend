type IdValue = string | { _id?: unknown } | { toString?: () => string };

const toId = (value: IdValue | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value && value._id) {
    return String(value._id);
  }
  if (typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }
  return null;
};

const formatTimeAgo = (value?: Date | string | null): string => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

const mapUser = (user: any) => {
  if (!user) return null;
  if (typeof user === "object" && "name" in user) {
    return {
      id: toId(user._id) || String(user.id || ""),
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
    };
  }
  const id = toId(user);
  return id ? { id } : null;
};

export const toCommunityPostResponse = (post: any) => {
  if (!post) return null;
  const id = toId(post._id) || String(post.id || "");
  const author = mapUser(post.author);
  const sharedPost = post.sharedPost
    ? {
        id: toId(post.sharedPost._id) || String(post.sharedPost.id || ""),
        author: mapUser(post.sharedPost.author),
        text: post.sharedPost.text || "",
        media: post.sharedPost.media || [],
        postType: post.sharedPost.postType || "regular",
        createdAt: post.sharedPost.createdAt,
        timeAgo: formatTimeAgo(post.sharedPost.createdAt),
      }
    : null;

  return {
    id,
    author,
    text: post.text || "",
    media: post.media || [],
    postType: post.postType || "regular",
    shareText: post.shareText || "",
    sharedPost,
    likesCount: Array.isArray(post.likes) ? post.likes.length : post.likesCount || 0,
    commentsCount: post.commentsCount || 0,
    sharesCount: post.sharesCount || 0,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    timeAgo: formatTimeAgo(post.createdAt),
  };
};

export const toCommunityCommentResponse = (comment: any) => {
  if (!comment) return null;
  return {
    id: toId(comment._id) || String(comment.id || ""),
    postId: toId(comment.post) || "",
    author: mapUser(comment.author),
    parentId: toId(comment.parent),
    text: comment.text || "",
    likesCount: Array.isArray(comment.likes) ? comment.likes.length : comment.likesCount || 0,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    timeAgo: formatTimeAgo(comment.createdAt),
  };
};

export const toCommunityReportResponse = (report: any) => {
  if (!report) return null;
  return {
    id: toId(report._id) || String(report.id || ""),
    postId: toId(report.post) || "",
    reportedUser: mapUser(report.reportedUser),
    count: report.count || 0,
    status: report.status || "pending",
    reasons: report.reasons || [],
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
};
