import mongoose from "mongoose";
import Conversation, { IConversation } from "./conversation.model";
import Message, { IMessage } from "./message.model";
import User from "../users/user.model";
import { CreateMessageInput, MessageQuery } from "./messages.validation";

const buildParticipantKey = (userId: string, otherUserId: string) =>
  [userId, otherUserId].sort().join(":");

const ensureRecipient = async (senderId: string, recipientId: string) => {
  const user = await User.findById(recipientId).select("blockedUsers");
  if (!user) {
    throw new Error("Recipient not found");
  }
  const blocked = user.blockedUsers?.map((id) => String(id)) || [];
  if (blocked.includes(senderId)) {
    throw new Error("Recipient is not available");
  }
  return user;
};

const getBlockedInfo = async (userId: string) => {
  const user = await User.findById(userId).select("blockedUsers").lean();
  const blockedIds = (user?.blockedUsers || []).map((id) => String(id));
  const blockedBy = await User.find({ blockedUsers: userId }).select("_id").lean();
  const blockedByIds = blockedBy.map((doc) => String(doc._id));
  const allBlocked = Array.from(new Set([...blockedIds, ...blockedByIds]));
  return { blockedIds, blockedByIds, allBlocked };
};

export const getOrCreateConversation = async (
  userId: string,
  otherUserId: string
): Promise<IConversation> => {
  if (userId === otherUserId) {
    throw new Error("Cannot message yourself");
  }

  await ensureRecipient(userId, otherUserId);
  const sender = await User.findById(userId).select("blockedUsers");
  if (sender?.blockedUsers?.map((id) => String(id)).includes(otherUserId)) {
    throw new Error("Recipient is not available");
  }

  const key = buildParticipantKey(userId, otherUserId);
  let conversation = await Conversation.findOne({ participantKey: key });
  if (!conversation) {
    try {
      const created = new Conversation({
        participants: [userId, otherUserId],
        participantKey: key,
      });
      conversation = await created.save();
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code === 11000) {
        conversation = await Conversation.findOne({ participantKey: key });
      } else {
        throw err;
      }
    }
  }

  if (!conversation) {
    throw new Error("Failed to start conversation");
  }

  return conversation;
};

export const listConversations = async (
  userId: string,
  filters?: { search?: string; status?: "all" | "read" | "unread" | "blocked" }
) => {
  const { allBlocked, blockedIds } = await getBlockedInfo(userId);
  const status = filters?.status || "all";
  const conditions: Record<string, unknown>[] = [{ participants: userId }];

  if (filters?.search) {
    const matches = await User.find({
      name: { $regex: filters.search, $options: "i" },
      _id: { $ne: userId },
    })
      .select("_id")
      .lean();
    const matchIds = matches.map((user) => user._id);
    if (matchIds.length === 0) {
      return { data: [], unreadCounts: new Map<string, number>(), blockedIds };
    }
    conditions.push({ participants: { $in: matchIds } });
  }

  if (status === "blocked") {
    if (blockedIds.length === 0) {
      return { data: [], unreadCounts: new Map<string, number>(), blockedIds };
    }
    conditions.push({ participants: { $in: blockedIds } });
  } else if (allBlocked.length > 0) {
    conditions.push({ participants: { $nin: allBlocked } });
  }

  const query =
    conditions.length === 1 ? conditions[0] : { $and: conditions };

  const conversations = await Conversation.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate({ path: "participants", select: "name avatarUrl role lastSeenAt" })
    .populate({ path: "lastMessage", select: "body sender recipient createdAt readAt conversation" })
    .lean();

  if (conversations.length === 0) {
    return { data: [], unreadCounts: new Map<string, number>(), blockedIds };
  }

  const conversationIds = conversations.map((conversation) => conversation._id);
  const unreadAgg = await Message.aggregate([
    {
      $match: {
        conversation: { $in: conversationIds },
        recipient: new mongoose.Types.ObjectId(userId),
        readAt: null,
      },
    },
    { $group: { _id: "$conversation", count: { $sum: 1 } } },
  ]);

  const unreadCounts = new Map<string, number>();
  unreadAgg.forEach((row: { _id: mongoose.Types.ObjectId; count: number }) => {
    unreadCounts.set(String(row._id), row.count);
  });

  const filtered =
    status === "all" || status === "blocked"
      ? conversations
      : conversations.filter((conversation) => {
          const count = unreadCounts.get(String(conversation._id)) || 0;
          return status === "unread" ? count > 0 : count === 0;
        });

  return { data: filtered, unreadCounts, blockedIds };
};

export const listMessages = async (
  userId: string,
  conversationId: string,
  query: MessageQuery
): Promise<{ data: any[]; pagination: { total: number; page: number; limit: number } }> => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  if (!conversation) {
    throw new Error("Conversation not found");
  }
  const { allBlocked } = await getBlockedInfo(userId);
  const otherParticipant = conversation.participants.find(
    (participant) => String(participant) !== userId
  );
  if (otherParticipant && allBlocked.includes(String(otherParticipant))) {
    throw new Error("Conversation not found");
  }

  const { page, limit } = query;
  const filter = { conversation: conversation._id };
  const total = await Message.countDocuments(filter);

  const data = await Message.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { data, pagination: { total, page, limit } };
};

export const createMessage = async (
  senderId: string,
  payload: CreateMessageInput
): Promise<IMessage> => {
  const { recipientId, body } = payload;
  const sender = await User.findById(senderId).select("blockedUsers");
  if (sender?.blockedUsers?.map((id) => String(id)).includes(recipientId)) {
    throw new Error("Recipient is not available");
  }
  const conversation = await getOrCreateConversation(senderId, recipientId);

  const message = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    recipient: recipientId,
    body: body.trim(),
  });

  conversation.lastMessage = message._id;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  return message;
};

export const createMessageWithAttachments = async (
  senderId: string,
  recipientId: string,
  body: string,
  attachments: {
    url: string;
    mimeType: string;
    fileName: string;
    size: number;
  }[]
): Promise<IMessage> => {
  const sender = await User.findById(senderId).select("blockedUsers");
  if (sender?.blockedUsers?.map((id) => String(id)).includes(recipientId)) {
    throw new Error("Recipient is not available");
  }
  const conversation = await getOrCreateConversation(senderId, recipientId);

  const message = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    recipient: recipientId,
    body: body || "",
    attachments,
  });

  conversation.lastMessage = message._id;
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();

  return message;
};

export const searchUsers = async (userId: string, query: string) => {
  const { allBlocked } = await getBlockedInfo(userId);
  const conditions: Record<string, unknown> = {
    _id: { $ne: userId, ...(allBlocked.length ? { $nin: allBlocked } : {}) },
    name: { $regex: query, $options: "i" },
  };

  return User.find(conditions).select("name avatarUrl role lastSeenAt").lean();
};

export const blockUser = async (userId: string, targetUserId: string) => {
  if (userId === targetUserId) {
    throw new Error("Cannot block yourself");
  }
  const target = await User.findById(targetUserId).select("_id");
  if (!target) {
    throw new Error("User not found");
  }
  await User.updateOne({ _id: userId }, { $addToSet: { blockedUsers: targetUserId } });
};

export const unblockUser = async (userId: string, targetUserId: string) => {
  await User.updateOne({ _id: userId }, { $pull: { blockedUsers: targetUserId } });
};

export const markConversationRead = async (
  userId: string,
  conversationId: string
): Promise<number> => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const result = await Message.updateMany(
    { conversation: conversation._id, recipient: userId, readAt: null },
    { readAt: new Date() }
  );

  return result.modifiedCount;
};

export const updateMessage = async (
  userId: string,
  messageId: string,
  body: string
): Promise<IMessage> => {
  const message = await Message.findOne({ _id: messageId, sender: userId });
  if (!message) {
    throw new Error("Message not found");
  }
  if (message.deletedAt) {
    throw new Error("Message already deleted");
  }

  message.body = body.trim();
  message.editedAt = new Date();
  await message.save();

  return message;
};

export const deleteMessage = async (userId: string, messageId: string): Promise<IMessage> => {
  const message = await Message.findOne({ _id: messageId, sender: userId });
  if (!message) {
    throw new Error("Message not found");
  }
  if (message.deletedAt) {
    return message;
  }

  message.body = "";
  message.deletedAt = new Date();
  await message.save();

  return message;
};
