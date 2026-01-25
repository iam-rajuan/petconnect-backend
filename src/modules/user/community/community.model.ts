import mongoose, { Document, Model, Schema } from "mongoose";

export type CommunityPostType = "regular" | "share" | "profile_update";

export interface IPostMedia {
  url: string;
  type: "image" | "video";
}

export interface ICommunityPost extends Document {
  author: mongoose.Types.ObjectId;
  text?: string;
  media: IPostMedia[];
  postType: CommunityPostType;
  sharedPost?: mongoose.Types.ObjectId | null;
  shareText?: string;
  likes: mongoose.Types.ObjectId[];
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommunityComment extends Document {
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  parent?: mongoose.Types.ObjectId | null;
  text: string;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type ReportStatus = "pending" | "dismissed" | "removed" | "warned";

export interface ICommunityReport extends Document {
  post: mongoose.Types.ObjectId;
  reportedUser: mongoose.Types.ObjectId;
  reporters: mongoose.Types.ObjectId[];
  reasons: string[];
  count: number;
  status: ReportStatus;
  lastReportedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IPostMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
  },
  { _id: false }
);

const communityPostSchema = new Schema<ICommunityPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    media: { type: [mediaSchema], default: [] },
    postType: {
      type: String,
      enum: ["regular", "share", "profile_update"],
      default: "regular",
    },
    sharedPost: { type: Schema.Types.ObjectId, ref: "CommunityPost", default: null },
    shareText: { type: String, default: "" },
    likes: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const communityCommentSchema = new Schema<ICommunityComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: "CommunityPost", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parent: { type: Schema.Types.ObjectId, ref: "CommunityComment", default: null },
    text: { type: String, required: true },
    likes: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true }
);

const communityReportSchema = new Schema<ICommunityReport>(
  {
    post: { type: Schema.Types.ObjectId, ref: "CommunityPost", required: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reporters: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    reasons: { type: [String], default: [] },
    count: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "dismissed", "removed", "warned"],
      default: "pending",
    },
    lastReportedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const CommunityPost: Model<ICommunityPost> = mongoose.model<ICommunityPost>(
  "CommunityPost",
  communityPostSchema
);
export const CommunityComment: Model<ICommunityComment> = mongoose.model<ICommunityComment>(
  "CommunityComment",
  communityCommentSchema
);
export const CommunityReport: Model<ICommunityReport> = mongoose.model<ICommunityReport>(
  "CommunityReport",
  communityReportSchema
);
