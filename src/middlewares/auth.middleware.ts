import { Request, Response, NextFunction } from "express";
import { verifyToken, AuthTokenPayload, TokenType } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: AuthTokenPayload;
}

const buildAuthMiddleware =
  (allowedTypes: TokenType[] = ["access"]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = verifyToken(token);
      if (!allowedTypes.includes(decoded.type)) {
        return res.status(401).json({
          success: false,
          message: "Invalid token type",
        });
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  };

const authMiddleware = buildAuthMiddleware(["access"]);
export const onboardingAuth = buildAuthMiddleware(["access", "setup"]);

export default authMiddleware;
