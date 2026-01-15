import jwt, { JwtPayload, SignOptions, VerifyOptions } from "jsonwebtoken";

const getSecret = (): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return process.env.JWT_SECRET;
};

export type TokenType = "access" | "refresh" | "setup";

export interface AuthTokenPayload extends JwtPayload {
  id: string;
  role: string;
  type: TokenType;
  tokenVersion?: number;
}

const signToken = (
  payload: Omit<AuthTokenPayload, "type">,
  type: TokenType,
  expiresIn: SignOptions["expiresIn"]
): string => {
  const options: SignOptions = { expiresIn };
  return jwt.sign({ ...payload, type }, getSecret(), options);
};

const accessTtl: SignOptions["expiresIn"] =
  (process.env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]) || "480m";
const refreshTtl: SignOptions["expiresIn"] =
  (process.env.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]) || "7d";
const setupTtl: SignOptions["expiresIn"] =
  (process.env.SETUP_TOKEN_EXPIRES_IN as SignOptions["expiresIn"]) || "30m";

export const signAccessToken = (payload: Omit<AuthTokenPayload, "type">): string =>
  signToken(payload, "access", accessTtl);

export const signRefreshToken = (payload: Omit<AuthTokenPayload, "type">): string =>
  signToken(payload, "refresh", refreshTtl);

export const signSetupToken = (payload: Omit<AuthTokenPayload, "type">): string =>
  signToken(payload, "setup", setupTtl);

export const verifyToken = (token: string, options?: VerifyOptions): AuthTokenPayload =>
  jwt.verify(token, getSecret(), options) as AuthTokenPayload;
