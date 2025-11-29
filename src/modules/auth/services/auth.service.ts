import bcrypt from "bcrypt";
import User, { IUser } from "../models/user.model";
import RefreshToken, { IRefreshToken } from "../models/refreshToken.model";
import { LoginInput, RegisterInput, RefreshTokenInput } from "../validations/auth.validation";
import { signAccessToken, signRefreshToken, verifyToken } from "../../../utils/jwt";

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
