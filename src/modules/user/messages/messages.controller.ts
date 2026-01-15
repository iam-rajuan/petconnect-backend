import { Request, Response } from "express";
import { AuthRequest } from "../../../middlewares/auth.middleware";
import * as messagesService from "./messages.service";
import { toConversationResponse, toMessageResponse } from "./messages.mapper";
import { MessageQuery } from "./messages.validation";
import { emitMessageDeleted, emitMessageUpdated, emitNewMessage } from "../../../realtime/socket";
import { isUserOnline } from "../../../realtime/presence";
import * as uploadsService from "../uploads/uploads.service";

const requireUser = (req: AuthRequest, res: Response): string | null => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return req.user.id;
};

export const listConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const query =
      (req as Request & {
        validatedQuery?: { search?: string; status?: "all" | "read" | "unread" | "blocked" };
      }).validatedQuery || {};
    const { data, unreadCounts, blockedIds } = await messagesService.listConversations(
      userId,
      query
    );
    res.json({
      success: true,
      data: data.map((conversation) => {
        const mapped = toConversationResponse(conversation, userId);
        if (!mapped) return null;
        const otherId = mapped.otherParticipant?.id;
        return {
          ...mapped,
          unreadCount: unreadCounts.get(String(conversation._id)) || 0,
          otherParticipant: mapped.otherParticipant
            ? {
                ...mapped.otherParticipant,
                isBlocked: otherId ? blockedIds.includes(otherId) : false,
              }
            : null,
        };
      }).filter(Boolean),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch conversations";
    res.status(400).json({ success: false, message });
  }
};

export const listMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const query =
      (req as Request & { validatedQuery?: MessageQuery }).validatedQuery || {
        page: 1,
        limit: 20,
      };

    const result = await messagesService.listMessages(userId, req.params.id, query);
    res.json({
      success: true,
      data: {
        data: result.data.map((message) => toMessageResponse(message)),
        pagination: result.pagination,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch messages";
    res.status(400).json({ success: false, message });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const message = await messagesService.createMessage(userId, req.body);
    emitNewMessage(message);

    res.status(201).json({
      success: true,
      data: toMessageResponse(message),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    res.status(400).json({ success: false, message });
  }
};

export const sendMessageWithAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const files = (req.files as Express.Multer.File[]) || [];
    const body =
      typeof req.body.body === "string" ? req.body.body.trim() : (req.body.body ?? "");

    if (!body && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message body or at least one attachment is required",
      });
    }

    const uploads = await Promise.all(
      files.map((file) =>
        uploadsService.uploadFileToS3(file.buffer, file.mimetype, "messages/attachments").then(
          (result) => ({
            url: result.url,
            mimeType: file.mimetype,
            fileName: file.originalname,
            size: file.size,
          })
        )
      )
    );

    const message = await messagesService.createMessageWithAttachments(
      userId,
      req.body.recipientId,
      body,
      uploads
    );
    emitNewMessage(message);

    res.status(201).json({
      success: true,
      data: toMessageResponse(message),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    res.status(400).json({ success: false, message });
  }
};

export const markConversationRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const updated = await messagesService.markConversationRead(userId, req.params.id);
    res.json({
      success: true,
      data: { updated },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark messages as read";
    res.status(400).json({ success: false, message });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const query =
      (req as Request & { validatedQuery?: { query?: string } }).validatedQuery || {};
    const users = await messagesService.searchUsers(userId, query.query || "");
    res.json({
      success: true,
      data: users.map((user) => ({
        id: String(user._id),
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isOnline: isUserOnline(String(user._id)),
        lastSeenAt: user.lastSeenAt || null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to search users";
    res.status(400).json({ success: false, message });
  }
};

export const blockUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    await messagesService.blockUser(userId, req.params.id);
    res.json({ success: true, message: "User blocked" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to block user";
    res.status(400).json({ success: false, message });
  }
};

export const unblockUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    await messagesService.unblockUser(userId, req.params.id);
    res.json({ success: true, message: "User unblocked" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unblock user";
    res.status(400).json({ success: false, message });
  }
};

export const updateMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const message = await messagesService.updateMessage(userId, req.params.id, req.body.body);
    emitMessageUpdated(message);

    res.json({
      success: true,
      data: toMessageResponse(message),
      message: "Message updated",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update message";
    res.status(400).json({ success: false, message });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const message = await messagesService.deleteMessage(userId, req.params.id);
    emitMessageDeleted(message);

    res.json({
      success: true,
      data: toMessageResponse(message),
      message: "Message deleted",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete message";
    res.status(400).json({ success: false, message });
  }
};
