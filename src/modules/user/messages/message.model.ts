import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  body: string;
  readAt?: Date | null;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  attachments?: {
    url: string;
    mimeType: string;
    fileName: string;
    size: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          mimeType: { type: String, required: true },
          fileName: { type: String, required: true },
          size: { type: Number, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

const Message: Model<IMessage> = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
