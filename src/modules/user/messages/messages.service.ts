import Conversation, { IConversation } from "./conversation.model";
import Message, { IMessage } from "./message.model";
import User from "../users/user.model";
import { CreateMessageInput, MessageQuery } from "./messages.validation";

const buildParticipantKey = (userId: string, otherUserId: string) =>
  [userId, otherUserId].sort().join(":");

const ensureRecipient = async (recipientId: string) => {
  const user = await User.findById(recipientId);
  if (!user) {
    throw new Error("Recipient not found");
  }
  return user;
};

export const getOrCreateConversation = async (
  userId: string,
  otherUserId: string
): Promise<IConversation> => {
  if (userId === otherUserId) {
    throw new Error("Cannot message yourself");
  }

  await ensureRecipient(otherUserId);

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

export const listConversations = async (userId: string) => {
  return Conversation.find({ participants: userId })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate({ path: "participants", select: "name avatarUrl role" })
    .populate({ path: "lastMessage", select: "body sender recipient createdAt readAt" })
    .lean();
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
