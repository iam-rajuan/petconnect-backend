import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const requireRole = (roles: string | string[]) => {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient role",
      });
    }

    next();
  };
};

export const requireAdmin = requireRole("admin");
export const requireUser = requireRole("user");
