import { NextFunction, Request, Response, Router } from "express";
import { ZodError, ZodSchema } from "zod";
import auth from "../../../middlewares/auth.middleware";
import validate from "../../../middlewares/validate.middleware";
import {
  createCommentSchema,
  createPostSchema,
  createReplySchema,
  listPostsQuerySchema,
  postIdParamSchema,
  commentIdParamSchema,
  reportPostSchema,
  sharePostSchema,
  updatePostSchema,
  updateCommentSchema,
  userIdParamSchema,
} from "./community.validation";
import * as communityController from "./community.controller";
import { uploadPostMedia } from "../uploads/upload.middleware";

const router = Router();

const validateParams =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.params);
      req.params = parsed as typeof req.params;
      next();
    } catch (err) {
      const isZodError = err instanceof ZodError;
      return res.status(400).json({
        success: false,
        message: isZodError
          ? err.issues?.[0]?.message || "Validation failed"
          : "Validation failed",
        issues: isZodError ? err.issues : err,
      });
    }
  };

const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const cleaned = Object.fromEntries(
      Object.entries(req.query || {}).flatMap(([key, value]) => {
        const v = Array.isArray(value) ? value[0] : value;
        return v === "" || v === undefined || v === null ? [] : [[key, v]];
      })
    );

    const result = schema.safeParse(cleaned);
    if (!result.success) {
      const issues = result.error.issues;
      return res.status(400).json({
        success: false,
        message: issues?.[0]?.message || "Validation failed",
        issues,
      });
    }

    (req as Request & { validatedQuery?: unknown }).validatedQuery = result.data;
    next();
  };

router.use(auth);

const maybeUploadPostMedia = (req: Request, res: Response, next: NextFunction) => {
  if (req.is("multipart/form-data")) {
    return uploadPostMedia(req, res, next);
  }
  return next();
};

router.post(
  "/posts",
  maybeUploadPostMedia,
  validate(createPostSchema),
  communityController.createPost
);
router.get("/posts", validateQuery(listPostsQuerySchema), communityController.listPosts);
router.get("/posts/me", validateQuery(listPostsQuerySchema), communityController.listMyPosts);
router.get("/posts/me/photos", communityController.listMyPhotos);
router.get(
  "/posts/user/:id",
  validateParams(userIdParamSchema),
  validateQuery(listPostsQuerySchema),
  communityController.listUserPosts
);
router.get(
  "/posts/user/:id/photos",
  validateParams(userIdParamSchema),
  communityController.listUserPhotos
);
router.get("/posts/:id", validateParams(postIdParamSchema), communityController.getPost);
router.patch(
  "/posts/:id",
  validateParams(postIdParamSchema),
  maybeUploadPostMedia,
  validate(updatePostSchema),
  communityController.updatePost
);
router.delete("/posts/:id", validateParams(postIdParamSchema), communityController.deletePost);
router.post("/posts/:id/like", validateParams(postIdParamSchema), communityController.toggleLike);
router.post(
  "/posts/:id/comments",
  validateParams(postIdParamSchema),
  validate(createCommentSchema),
  communityController.addComment
);
router.get(
  "/posts/:id/comments",
  validateParams(postIdParamSchema),
  communityController.listComments
);
router.post(
  "/comments/:id/replies",
  validateParams(commentIdParamSchema),
  validate(createReplySchema),
  communityController.replyToComment
);
router.patch(
  "/comments/:id",
  validateParams(commentIdParamSchema),
  validate(updateCommentSchema),
  communityController.updateComment
);
router.delete(
  "/comments/:id",
  validateParams(commentIdParamSchema),
  communityController.deleteComment
);
router.post(
  "/comments/:id/like",
  validateParams(commentIdParamSchema),
  communityController.toggleLikeComment
);
router.post(
  "/posts/:id/share",
  validateParams(postIdParamSchema),
  validate(sharePostSchema),
  communityController.sharePost
);
router.post(
  "/posts/:id/report",
  validateParams(postIdParamSchema),
  validate(reportPostSchema),
  communityController.reportPost
);

export default router;
