import bcrypt from "bcrypt";
import User, { IUser } from "../models/user.model";
import RefreshToken, { IRefreshToken } from "../models/refreshToken.model";
import {
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../validations/auth.validation";
import { signAccessToken, signRefreshToken, verifyToken } from "../../../utils/jwt";
import { sendMail } from "../../../utils/mail";

import { sendFirebaseOtp, verifyFirebaseOtp } from "../../../utils/firebase-sms";





export const sendPhoneOtp = async ({ phone }: { phone: string }) => {
  const sessionInfo = await sendFirebaseOtp(phone);
  return sessionInfo;
};

export const verifyPhoneOtp = async ({
  phone,
  otp,
  sessionInfo,
}: {
  phone: string;
  otp: string;
  sessionInfo: string;
}) => {
  const result = await verifyFirebaseOtp(sessionInfo, otp);

  let user = await User.findOne({ phone });

  if (!user) {
    user = await User.create({
      phone,
      isPhoneVerified: true,
      firebaseUid: result.localId,
      name: "User-" + phone,
      password: "", // not needed
    });
  }

  const payload = { id: user._id.toString(), role: user.role };

  return {
    user,
    tokens: {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    },
  };
};



export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: IUser;
  tokens: AuthTokens;
}

const normalizeContact = (value?: string): string | undefined => value?.trim() || undefined;

const hashPassword = async (password?: string): Promise<string> => {
  const sanitized = password?.trim();
  if (!sanitized) {
    throw new Error("Password is required");
  }
  return bcrypt.hash(sanitized, 10);
};

const generateOtp = (): string => Math.floor(100000 + Math.random() * 900000).toString();

const addMinutes = (minutes: number): Date => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date;
};

const saveRefreshToken = async (userId: string, token: string, expiresAt: Date) => {
  const hashedToken = await bcrypt.hash(token, 10);
  await RefreshToken.create({
    user: userId,
    token: hashedToken,
    expiresAt,
    revoked: false,
  });
};

const buildTokens = async (user: IUser): Promise<AuthTokens> => {
  const payload = { id: user._id.toString(), role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const decodedRefresh = verifyToken(refreshToken);
  const expiresAt = decodedRefresh.exp ? new Date(decodedRefresh.exp * 1000) : new Date();

  await saveRefreshToken(user._id.toString(), refreshToken, expiresAt);

  return { accessToken, refreshToken };
};

export const register = async ({
  name,
  email,
  phone,
  password,
}: RegisterInput): Promise<AuthResult> => {
  const sanitizedName = name?.trim();
  if (!sanitizedName) {
    throw new Error("Name is required");
  }

  const normalizedEmail = email?.trim().toLowerCase() || undefined;
  const sanitizedPhone = normalizeContact(phone);

  if (!normalizedEmail && !sanitizedPhone) {
    throw new Error("Email or phone is required");
  }

  const contactFilters: Record<string, string>[] = [];
  if (normalizedEmail) contactFilters.push({ email: normalizedEmail });
  if (sanitizedPhone) contactFilters.push({ phone: sanitizedPhone });

  const existingUser = await User.findOne({
    $or: contactFilters,
  });

  if (existingUser) {
    throw new Error("User already exists with this email or phone");
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    name: sanitizedName,
    email: normalizedEmail,
    phone: sanitizedPhone,
    password: hashedPassword,
  });

  const tokens = await buildTokens(user);

  return { user, tokens };
};

export const ensureVerificationOnRegister = async (user: IUser): Promise<void> => {
  if (user.email && !user.isVerified) {
    await sendEmailVerificationOtp(user);
  }
};

export const login = async ({
  email,
  phone,
  password,
}: LoginInput): Promise<AuthResult> => {
  const normalizedEmail = email?.trim().toLowerCase() || undefined;
  const sanitizedPhone = normalizeContact(phone);
  const sanitizedPassword = password?.trim();

  if (!normalizedEmail && !sanitizedPhone) {
    throw new Error("Email or phone is required");
  }

  const contactFilters: Record<string, string>[] = [];
  if (normalizedEmail) contactFilters.push({ email: normalizedEmail });
  if (sanitizedPhone) contactFilters.push({ phone: sanitizedPhone });

  const user = await User.findOne({
    $or: contactFilters,
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!sanitizedPassword) {
    throw new Error("Password is required");
  }

  const match = await bcrypt.compare(sanitizedPassword, user.password);
  if (!match) {
    throw new Error("Invalid credentials");
  }

  const tokens = await buildTokens(user);

  return { user, tokens };
};

const findMatchingRefreshToken = async (
  userId: string,
  rawToken: string
): Promise<IRefreshToken | null> => {
  const activeTokens = await RefreshToken.find({
    user: userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });

  for (const tokenDoc of activeTokens) {
    const isMatch = await bcrypt.compare(rawToken, tokenDoc.token);
    if (isMatch) {
      return tokenDoc;
    }
  }

  return null;
};

export const refreshTokens = async ({ refreshToken }: RefreshTokenInput): Promise<AuthTokens> => {
  const decoded = verifyToken(refreshToken);

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  const tokenDoc = await findMatchingRefreshToken(decoded.id, refreshToken);

  if (!tokenDoc) {
    throw new Error("Refresh token is invalid or expired");
  }

  tokenDoc.revoked = true;
  tokenDoc.revokedAt = new Date();
  await tokenDoc.save();

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new Error("User not found");
  }

  return buildTokens(user);
};

export const logout = async ({ refreshToken }: RefreshTokenInput): Promise<void> => {
  const decoded = verifyToken(refreshToken);

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  const tokenDoc = await findMatchingRefreshToken(decoded.id, refreshToken);

  if (tokenDoc) {
    tokenDoc.revoked = true;
    tokenDoc.revokedAt = new Date();
    await tokenDoc.save();
  }
};

export const verifyEmailWithOtp = async ({ email, otp }: VerifyEmailInput): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new Error("Invalid OTP");
  }

  if (
    !user.emailVerificationToken ||
    !user.emailVerificationExpires ||
    user.emailVerificationToken !== otp ||
    user.emailVerificationExpires < new Date()
  ) {
    throw new Error("Invalid or expired OTP");
  }

  user.isVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  await user.save();
};

export const requestPasswordReset = async ({ email }: ForgotPasswordInput): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  // Always respond success later to avoid disclosing existence
  if (!user) {
    return;
  }

  const otp = generateOtp();
  user.resetPasswordToken = otp;
  user.resetPasswordExpires = addMinutes(10);
  await user.save();

  await sendMail({
    to: normalizedEmail,
    subject: "Password Reset OTP",
    text: `Your password reset OTP is ${otp}. It expires in 10 minutes.`,
  });
};

export const resetPasswordWithOtp = async ({
  email,
  otp,
  password,
}: ResetPasswordInput): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (
    !user ||
    !user.resetPasswordToken ||
    !user.resetPasswordExpires ||
    user.resetPasswordToken !== otp ||
    user.resetPasswordExpires < new Date()
  ) {
    throw new Error("Invalid or expired OTP");
  }

  const hashed = await hashPassword(password);
  user.password = hashed;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();
};

export const sendEmailVerificationOtp = async (user: IUser): Promise<void> => {
  const otp = generateOtp();
  user.emailVerificationToken = otp;
  user.emailVerificationExpires = addMinutes(30);
  await user.save();

  if (user.email) {
    await sendMail({
      to: user.email,
      subject: "Verify your email",
      text: `Your verification OTP is ${otp}. It expires in 30 minutes.`,
    });
  }
};
