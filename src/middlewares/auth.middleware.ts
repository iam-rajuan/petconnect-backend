import { Request, Response, NextFunction } from "express";
import { verifyToken, AuthTokenPayload } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: AuthTokenPayload;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
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
    if (decoded.type !== "access") {
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

export default authMiddleware;
