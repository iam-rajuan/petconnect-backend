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

export const toMessageResponse = (message: any) => {
  if (!message) return null;
  return {
    id: toId(message._id) || String(message.id || ""),
    conversationId: toId(message.conversation) || "",
    senderId: toId(message.sender) || "",
    recipientId: toId(message.recipient) || "",
    body: message.body,
    readAt: message.readAt || null,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
};

export const toConversationResponse = (conversation: any, userId: string) => {
  if (!conversation) return null;
  const participants = (conversation.participants || [])
    .map((participant: any) => {
      const id = toId(participant);
      if (!id) return null;
      if (typeof participant === "object" && "name" in participant) {
        return {
          id,
          name: participant.name,
          avatarUrl: participant.avatarUrl,
          role: participant.role,
        };
      }
      return { id };
    })
    .filter(Boolean);

  const otherParticipant =
    participants.find((participant: any) => participant.id !== userId) || null;

  return {
    id: toId(conversation._id) || String(conversation.id || ""),
    participants,
    otherParticipant,
    lastMessage:
      conversation.lastMessage && typeof conversation.lastMessage === "object"
        ? toMessageResponse(conversation.lastMessage)
        : null,
    lastMessageAt: conversation.lastMessageAt || null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
};
