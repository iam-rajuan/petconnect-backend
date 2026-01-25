import { Request, Response } from "express";
import { AuthRequest } from "../../../middlewares/auth.middleware";
import * as communityService from "./community.service";
import * as uploadsService from "../uploads/uploads.service";
import { CommunityComment } from "./community.model";
import {
  toCommunityCommentResponse,
  toCommunityPostResponse,
  toCommunityReportResponse,
} from "./community.mapper";

const requireUser = (req: AuthRequest, res: Response): string | null => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return req.user.id;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
};

const detectMediaType = (mimeType: string): "image" | "video" =>
  mimeType.startsWith("video/") ? "video" : "image";

export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const files = req.files as Express.Multer.File[] | undefined;
    const uploads = await Promise.all(
      (files || []).map((file) =>
        uploadsService.uploadFileToS3(file.buffer, file.mimetype, "community/posts")
      )
    );
    const media = uploads.map((item, index) => ({
      url: item.url,
      type: detectMediaType(files?.[index]?.mimetype || "image"),
    }));

    const post = await communityService.createPost(userId, req.body.text, media);
    const populated = await communityService.getPostById(post._id.toString());
    res.status(201).json({ success: true, data: toCommunityPostResponse(populated, userId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create post";
    res.status(400).json({ success: false, message });
  }
};

export const listPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = (req as Request & { validatedQuery?: any }).validatedQuery || {};
    const result = await communityService.listPosts({ page, limit });
    res.json({
      success: true,
      data: result.data.map((item) => toCommunityPostResponse(item, req.user?.id)),
      pagination: result.pagination,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch posts";
    res.status(400).json({ success: false, message });
  }
};

export const getPost = async (req: AuthRequest, res: Response) => {
  try {
    const post = await communityService.getPostById(req.params.id);
    res.json({ success: true, data: toCommunityPostResponse(post, req.user?.id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Post not found";
    const status = message === "Post not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const listMyPosts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { page, limit } = (req as Request & { validatedQuery?: any }).validatedQuery || {};
    const result = await communityService.listPosts({ page, limit, authorId: userId });
    res.json({
      success: true,
      data: result.data.map((item) => toCommunityPostResponse(item, req.user?.id)),
      pagination: result.pagination,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch posts";
    res.status(400).json({ success: false, message });
  }
};

export const listMyPhotos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const photos = await communityService.listMyPostPhotos(userId);
    res.json({ success: true, data: photos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch photos";
    res.status(400).json({ success: false, message });
  }
};

export const listUserPosts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { page, limit } = (req as Request & { validatedQuery?: any }).validatedQuery || {};
    const result = await communityService.listPosts({
      page,
      limit,
      authorId: req.params.id,
    });
    res.json({
      success: true,
      data: result.data.map((item) => toCommunityPostResponse(item, req.user?.id)),
      pagination: result.pagination,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch posts";
    res.status(400).json({ success: false, message });
  }
};

export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const postId = req.params.id;

    const files = req.files as Express.Multer.File[] | undefined;
    const hasNewMedia = Array.isArray(files) && files.length > 0;
    const keepMedia = toStringArray(req.body.keepMedia);
    const deleteMedia = toStringArray(req.body.deleteMedia);
    const hasMediaListMutation = keepMedia.length > 0 || deleteMedia.length > 0;

    if (hasNewMedia || hasMediaListMutation) {
      const existing = await communityService.ensurePostOwner(userId, postId);
      const uploads = hasNewMedia
        ? await Promise.all(
            files.map((file) =>
              uploadsService.uploadFileToS3(
                file.buffer,
                file.mimetype,
                `community/posts/${postId}`
              )
            )
          )
        : [];

      const matchesMedia = (mediaUrl: string, target: string) =>
        mediaUrl === target || mediaUrl.endsWith(target);
      const uploadedMedia = uploads.map((item, index) => ({
        url: item.url,
        type: detectMediaType(files?.[index]?.mimetype || "image"),
      }));
      const currentMedia = existing.media || [];
      const shouldReplaceAll = hasNewMedia && !hasMediaListMutation;
      let nextMedia = shouldReplaceAll ? [] : currentMedia.slice();

      if (keepMedia.length > 0) {
        nextMedia = nextMedia.filter((media) =>
          keepMedia.some((keep) => matchesMedia(media.url, keep))
        );
      }
      if (deleteMedia.length > 0) {
        nextMedia = nextMedia.filter(
          (media) => !deleteMedia.some((remove) => matchesMedia(media.url, remove))
        );
      }
      if (hasNewMedia) {
        nextMedia = shouldReplaceAll ? uploadedMedia : [...nextMedia, ...uploadedMedia];
      }

      const removedMedia = currentMedia.filter(
        (media) => !nextMedia.some((next) => matchesMedia(media.url, next.url))
      );
      if (removedMedia.length > 0) {
        await Promise.all(
          removedMedia
            .filter((media) => media.url.includes(".amazonaws.com/"))
            .map((media) =>
              uploadsService.deleteFileFromS3(uploadsService.extractKeyFromUrl(media.url))
            )
        );
      }

      req.body.media = nextMedia;
    }

    const post = await communityService.updatePost(userId, postId, {
      text: req.body.text,
      media: req.body.media,
    });
    const populated = await communityService.getPostById(post._id.toString());
    res.json({
      success: true,
      data: toCommunityPostResponse(populated, userId),
      message: "Post updated",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update post";
    const status = message === "Post not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    await communityService.deletePost(userId, req.params.id);
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete post";
    const status = message === "Post not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { post, liked } = await communityService.toggleLikePost(userId, req.params.id);
    const populated = await communityService.getPostById(post._id.toString());
    res.json({
      success: true,
      data: toCommunityPostResponse(populated, userId),
      message: liked ? "Post liked" : "Post unliked",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to like post";
    const status = message === "Post not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const comment = await communityService.addComment(userId, req.params.id, req.body.text);
    const populated = await CommunityComment.findById(comment._id).populate({
      path: "author",
      select: "name username avatarUrl",
    });
    res.status(201).json({ success: true, data: toCommunityCommentResponse(populated, userId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add comment";
    const status = message === "Post not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const replyToComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const reply = await communityService.addReply(userId, req.params.id, req.body.text);
    const populated = await CommunityComment.findById(reply._id).populate({
      path: "author",
      select: "name username avatarUrl",
    });
    res.status(201).json({ success: true, data: toCommunityCommentResponse(populated, userId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add reply";
    const status = message === "Comment not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const updateComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const comment = await communityService.updateComment(userId, req.params.id, req.body.text);
    const populated = await CommunityComment.findById(comment._id).populate({
      path: "author",
      select: "name username avatarUrl",
    });
    res.json({
      success: true,
      data: toCommunityCommentResponse(populated, userId),
      message: "Comment updated",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update comment";
    const status = message === "Comment not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    await communityService.deleteComment(userId, req.params.id);
    res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete comment";
    const status = message === "Comment not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const toggleLikeComment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { comment, liked } = await communityService.toggleLikeComment(userId, req.params.id);
    const populated = await CommunityComment.findById(comment._id).populate({
      path: "author",
      select: "name username avatarUrl",
    });
    res.json({
      success: true,
      data: toCommunityCommentResponse(populated, userId),
      message: liked ? "Comment liked" : "Comment unliked",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to like comment";
    const status = message === "Comment not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const listComments = async (req: AuthRequest, res: Response) => {
  try {
    const items = await communityService.listCommentsWithReplies(req.params.id);
    const data = items.map(({ comment, replies }) => ({
      comment: toCommunityCommentResponse(comment, req.user?.id),
      replies: replies.map((reply) => toCommunityCommentResponse(reply, req.user?.id)),
    }));
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch comments";
    res.status(400).json({ success: false, message });
  }
};

export const sharePost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const post = await communityService.createSharedPost(userId, req.params.id, req.body.text);
    const populated = await communityService.getPostById(post._id.toString());
    res.status(201).json({ success: true, data: toCommunityPostResponse(populated, userId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to share post";
    const status = message === "Post not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const reportPost = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const report = await communityService.reportPost(userId, req.params.id, req.body.reason);
    const populated = await communityService.getReportById(report._id.toString());
    res.status(201).json({ success: true, data: toCommunityReportResponse(populated) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to report post";
    const status = message === "Post not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};
