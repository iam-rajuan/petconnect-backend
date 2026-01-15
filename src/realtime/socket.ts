import { Server as HttpServer } from "http";
import { Server as SocketServer, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import { createMessageSchema } from "../modules/user/messages/messages.validation";
import * as messagesService from "../modules/user/messages/messages.service";
import { toMessageResponse } from "../modules/user/messages/messages.mapper";
import { markOffline, markOnline } from "./presence";
import User from "../modules/user/users/user.model";

let io: SocketServer | null = null;

const parseToken = (socket: Socket): string | null => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const header = socket.handshake.headers?.authorization;
  console.log("Authorization Header:", header);
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7);
  }

  return null;
};

export const initSocketServer = (httpServer: HttpServer) => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket: Socket, next: (err?: Error) => void) => {
    const token = parseToken(socket);
    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const decoded = verifyToken(token);
      if (decoded.type !== "access") {
        return next(new Error("Unauthorized"));
      }
      socket.data.userId = decoded.id;
      return next();
    } catch (err) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    if (userId) {
      socket.join(userId);
      markOnline(userId);
    }

    socket.on("conversation:join", (conversationId: string) => {
      if (typeof conversationId === "string" && conversationId.trim()) {
        socket.join(conversationId.trim());
      }
    });

    socket.on("conversation:leave", (conversationId: string) => {
      if (typeof conversationId === "string" && conversationId.trim()) {
        socket.leave(conversationId.trim());
      }
    });

    socket.on(
      "message:send",
      async (
        payload: unknown,
        ack?: (response: { success: boolean; data?: unknown; message?: string }) => void
      ) => {
      try {
        const parsed = createMessageSchema.parse(payload);
        const message = await messagesService.createMessage(userId, parsed);
        emitNewMessage(message);
        if (typeof ack === "function") {
          ack({ success: true, data: toMessageResponse(message) });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send message";
        if (typeof ack === "function") {
          ack({ success: false, message });
        }
      }
      }
    );

    socket.on("disconnect", () => {
      if (userId) {
        const wentOffline = markOffline(userId);
        if (wentOffline) {
          User.updateOne({ _id: userId }, { lastSeenAt: new Date() }).catch(() => undefined);
        }
      }
    });
  });

  return io;
};

export const emitNewMessage = (message: any) => {
  if (!io) return;
  const payload = toMessageResponse(message);
  if (!payload) return;

  if (payload.senderId) {
    io.to(payload.senderId).emit("message:new", payload);
  }
  if (payload.recipientId) {
    io.to(payload.recipientId).emit("message:new", payload);
  }
  if (payload.conversationId) {
    io.to(payload.conversationId).emit("message:new", payload);
  }
};

export const emitMessageUpdated = (message: any) => {
  if (!io) return;
  const payload = toMessageResponse(message);
  if (!payload) return;

  if (payload.senderId) {
    io.to(payload.senderId).emit("message:updated", payload);
  }
  if (payload.recipientId) {
    io.to(payload.recipientId).emit("message:updated", payload);
  }
  if (payload.conversationId) {
    io.to(payload.conversationId).emit("message:updated", payload);
  }
};

export const emitMessageDeleted = (message: any) => {
  if (!io) return;
  const payload = toMessageResponse(message);
  if (!payload) return;

  if (payload.senderId) {
    io.to(payload.senderId).emit("message:deleted", payload);
  }
  if (payload.recipientId) {
    io.to(payload.recipientId).emit("message:deleted", payload);
  }
  if (payload.conversationId) {
    io.to(payload.conversationId).emit("message:deleted", payload);
  }
};
