import { Request, Response } from "express";
import { AuthRequest } from "../../../middlewares/auth.middleware";
import * as messagesService from "./messages.service";
import { toConversationResponse, toMessageResponse } from "./messages.mapper";
import { MessageQuery } from "./messages.validation";
import { emitNewMessage } from "../../../realtime/socket";

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

    const conversations = await messagesService.listConversations(userId);
    res.json({
      success: true,
      data: conversations.map((conversation) => toConversationResponse(conversation, userId)),
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
