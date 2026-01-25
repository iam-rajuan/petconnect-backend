import mongoose from "mongoose";
import User from "../users/user.model";
import {
  CommunityComment,
  CommunityPost,
  CommunityReport,
  IPostMedia,
  ReportStatus,
} from "./community.model";

const sanitizePagination = (page?: number, limit?: number) => {
  const safePage = !page || Number.isNaN(page) || page < 1 ? 1 : Math.floor(page);
  const safeLimit =
    !limit || Number.isNaN(limit) || limit < 1 || limit > 100 ? 10 : Math.floor(limit);
  return { page: safePage, limit: safeLimit };
};

export const ensurePostOwner = async (userId: string, postId: string) => {
  const post = await CommunityPost.findOne({
    _id: postId,
    author: new mongoose.Types.ObjectId(userId),
  });
  if (!post) {
    throw new Error("Post not found");
  }
  return post;
};

export const createPost = async (
  userId: string,
  text: string | undefined,
  media: IPostMedia[]
) => {
  if (!text && (!media || media.length === 0)) {
    throw new Error("Post text or media is required");
  }

  return CommunityPost.create({
    author: new mongoose.Types.ObjectId(userId),
    text: text?.trim() || "",
    media: media || [],
    postType: "regular",
  });
};

export const createSharedPost = async (
  userId: string,
  postId: string,
  shareText?: string
) => {
  const original = await CommunityPost.findById(postId);
  if (!original) {
    throw new Error("Post not found");
  }

  const shared = await CommunityPost.create({
    author: new mongoose.Types.ObjectId(userId),
    shareText: shareText?.trim() || "",
    sharedPost: original._id,
    postType: "share",
  });

  await CommunityPost.updateOne({ _id: original._id }, { $inc: { sharesCount: 1 } });
  return shared;
};

export const listPosts = async (
  filters: { page?: number; limit?: number; authorId?: string } = {}
) => {
  const { page, limit } = sanitizePagination(filters.page, filters.limit);
  const query: Record<string, unknown> = {};
  if (filters.authorId) {
    query.author = new mongoose.Types.ObjectId(filters.authorId);
  }

  const [posts, total] = await Promise.all([
    CommunityPost.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "author", select: "name username avatarUrl" })
      .populate({
        path: "sharedPost",
        populate: { path: "author", select: "name username avatarUrl" },
      }),
    CommunityPost.countDocuments(query),
  ]);

  return {
    data: posts,
    pagination: {
      total,
      page,
      limit,
      totalPages: total === 0 ? 1 : Math.ceil(total / limit),
    },
  };
};

export const getPostById = async (postId: string) => {
  const post = await CommunityPost.findById(postId)
    .populate({ path: "author", select: "name username avatarUrl" })
    .populate({
      path: "sharedPost",
      populate: { path: "author", select: "name username avatarUrl" },
    });
  if (!post) {
    throw new Error("Post not found");
  }
  return post;
};

export const updatePost = async (
  userId: string,
  postId: string,
  payload: { text?: string; media?: IPostMedia[] }
) => {
  const post = await ensurePostOwner(userId, postId);
  if (payload.text !== undefined) {
    post.text = payload.text.trim();
  }
  if (payload.media !== undefined) {
    post.media = payload.media;
  }
  await post.save();
  return post;
};

export const deletePost = async (userId: string, postId: string) => {
  const post = await ensurePostOwner(userId, postId);
  await Promise.all([
    CommunityPost.deleteOne({ _id: post._id }),
    CommunityComment.deleteMany({ post: post._id }),
    CommunityReport.deleteMany({ post: post._id }),
  ]);
};

export const toggleLikePost = async (userId: string, postId: string) => {
  const post = await CommunityPost.findById(postId);
  if (!post) {
    throw new Error("Post not found");
  }
  const existingIndex = post.likes.findIndex((id) => id.toString() === userId);
  let liked = false;
  if (existingIndex >= 0) {
    post.likes.splice(existingIndex, 1);
  } else {
    post.likes.push(new mongoose.Types.ObjectId(userId));
    liked = true;
  }
  await post.save();
  return { post, liked };
};

export const addComment = async (userId: string, postId: string, text: string) => {
  const post = await CommunityPost.findById(postId);
  if (!post) {
    throw new Error("Post not found");
  }
  const comment = await CommunityComment.create({
    post: post._id,
    author: new mongoose.Types.ObjectId(userId),
    text: text.trim(),
  });
  await CommunityPost.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } });
  return comment;
};

export const addReply = async (userId: string, commentId: string, text: string) => {
  const parent = await CommunityComment.findById(commentId);
  if (!parent) {
    throw new Error("Comment not found");
  }
  const reply = await CommunityComment.create({
    post: parent.post,
    author: new mongoose.Types.ObjectId(userId),
    parent: parent._id,
    text: text.trim(),
  });
  await CommunityPost.updateOne({ _id: parent.post }, { $inc: { commentsCount: 1 } });
  return reply;
};

export const updateComment = async (userId: string, commentId: string, text: string) => {
  const comment = await CommunityComment.findOne({ _id: commentId, author: userId });
  if (!comment) {
    throw new Error("Comment not found");
  }
  comment.text = text.trim();
  await comment.save();
  return comment;
};

export const deleteComment = async (userId: string, commentId: string) => {
  const comment = await CommunityComment.findOne({ _id: commentId, author: userId });
  if (!comment) {
    throw new Error("Comment not found");
  }
  const replyIds = await CommunityComment.find({ parent: comment._id }).select("_id").lean();
  const totalDeleted = 1 + replyIds.length;
  await Promise.all([
    CommunityComment.deleteMany({
      _id: { $in: [comment._id, ...replyIds.map((item: any) => item._id)] },
    }),
    CommunityPost.updateOne({ _id: comment.post }, { $inc: { commentsCount: -totalDeleted } }),
  ]);
};

export const toggleLikeComment = async (userId: string, commentId: string) => {
  const comment = await CommunityComment.findById(commentId);
  if (!comment) {
    throw new Error("Comment not found");
  }
  const existingIndex = comment.likes.findIndex((id) => id.toString() === userId);
  let liked = false;
  if (existingIndex >= 0) {
    comment.likes.splice(existingIndex, 1);
  } else {
    comment.likes.push(new mongoose.Types.ObjectId(userId));
    liked = true;
  }
  await comment.save();
  return { comment, liked };
};

export const listCommentsWithReplies = async (postId: string) => {
  const comments = await CommunityComment.find({ post: postId })
    .sort({ createdAt: 1 })
    .populate({ path: "author", select: "name username avatarUrl" });

  const topLevel: any[] = [];
  const byParent = new Map<string, any[]>();

  comments.forEach((comment) => {
    const parentId = comment.parent ? comment.parent.toString() : null;
    if (!parentId) {
      topLevel.push(comment);
      return;
    }
    if (!byParent.has(parentId)) {
      byParent.set(parentId, []);
    }
    byParent.get(parentId)?.push(comment);
  });

  return topLevel.map((comment) => ({
    comment,
    replies: byParent.get(comment._id.toString()) || [],
  }));
};

export const listMyPostPhotos = async (userId: string) => {
  const posts = await CommunityPost.find({ author: userId })
    .sort({ createdAt: -1 })
    .select("media createdAt")
    .lean();
  const photos = posts.flatMap((post: any) =>
    (post.media || [])
      .filter((item: any) => item.type === "image")
      .map((item: any) => ({
        url: item.url,
        type: item.type,
        postId: post._id,
        createdAt: post.createdAt,
      }))
  );
  return photos;
};

export const reportPost = async (userId: string, postId: string, reason?: string) => {
  const post = await CommunityPost.findById(postId);
  if (!post) {
    throw new Error("Post not found");
  }
  if (post.author.toString() === userId) {
    throw new Error("You cannot report your own post");
  }

  const report = await CommunityReport.findOne({ post: post._id });
  if (!report) {
    return CommunityReport.create({
      post: post._id,
      reportedUser: post.author,
      reporters: [new mongoose.Types.ObjectId(userId)],
      reasons: reason ? [reason.trim()] : [],
      count: 1,
      status: "pending",
      lastReportedAt: new Date(),
    });
  }

  const alreadyReported = report.reporters.some((id) => id.toString() === userId);
  if (!alreadyReported) {
    report.reporters.push(new mongoose.Types.ObjectId(userId));
    if (reason) {
      report.reasons.push(reason.trim());
    }
    report.count = report.reporters.length;
    report.lastReportedAt = new Date();
    if (report.status === "dismissed") {
      report.status = "pending";
    }
    await report.save();
  }

  return report;
};

export const listReports = async () => {
  return CommunityReport.find()
    .sort({ updatedAt: -1 })
    .populate({ path: "reportedUser", select: "name username avatarUrl" });
};

export const getReportById = async (reportId: string) => {
  const report = await CommunityReport.findById(reportId)
    .populate({ path: "reportedUser", select: "name username avatarUrl" })
    .populate({
      path: "post",
      select: "text media author createdAt",
      populate: { path: "author", select: "name username avatarUrl" },
    });
  if (!report) {
    throw new Error("Report not found");
  }
  return report;
};

export const updateReportStatus = async (reportId: string, status: ReportStatus) => {
  const report = await CommunityReport.findById(reportId);
  if (!report) {
    throw new Error("Report not found");
  }
  report.status = status;
  await report.save();
  return report;
};

export const deleteReport = async (reportId: string) => {
  const report = await CommunityReport.findById(reportId);
  if (!report) {
    throw new Error("Report not found");
  }
  await CommunityReport.deleteOne({ _id: report._id });
};

export const removeReportedContent = async (reportId: string) => {
  const report = await CommunityReport.findById(reportId);
  if (!report) {
    throw new Error("Report not found");
  }
  await Promise.all([
    CommunityPost.deleteOne({ _id: report.post }),
    CommunityComment.deleteMany({ post: report.post }),
  ]);
  report.status = "removed";
  await report.save();
  return report;
};

export const createProfileUpdatePost = async (userId: string, avatarUrl: string) => {
  const user = await User.findById(userId).select("name");
  if (!user) {
    throw new Error("User not found");
  }
  return CommunityPost.create({
    author: new mongoose.Types.ObjectId(userId),
    text: `${user.name} updated profile picture.`,
    media: [{ url: avatarUrl, type: "image" }],
    postType: "profile_update",
  });
};

export const createCoverUpdatePost = async (userId: string, coverUrl: string) => {
  const user = await User.findById(userId).select("name");
  if (!user) {
    throw new Error("User not found");
  }
  return CommunityPost.create({
    author: new mongoose.Types.ObjectId(userId),
    text: `${user.name} updated cover picture.`,
    media: [{ url: coverUrl, type: "image" }],
    postType: "profile_update",
  });
};
