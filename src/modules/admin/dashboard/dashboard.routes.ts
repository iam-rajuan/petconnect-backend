import { NextFunction, Request, Response, Router } from "express";
import { ZodError, ZodSchema } from "zod";
import adminAuth from "../auth/admin.middleware";
import * as dashboardController from "./dashboard.controller";
import {
  monthlyBreakdownQuerySchema,
  yearlyMetricsQuerySchema,
} from "../analytics/analytics.validation";

const router = Router();

const validateQuery =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const cleaned = Object.fromEntries(
      Object.entries(req.query || {}).flatMap(([key, value]) => {
        const v = Array.isArray(value) ? value[0] : value;
        return v === "" || v === undefined || v === null ? [] : [[key, v]];
      })
    );

    try {
      const parsed = schema.parse(cleaned);
      (req as Request & { validatedQuery?: unknown }).validatedQuery = parsed;
      next();
    } catch (err) {
      const isZodError = err instanceof ZodError;
      return res.status(400).json({
        success: false,
        message: isZodError
          ? err.issues?.[0]?.message || "Validation failed"
          : "Validation failed",
        issues: isZodError ? err.issues : err,
      });
    }
  };

router.use(adminAuth);

router.get(
  "/monthly-breakdown",
  validateQuery(monthlyBreakdownQuerySchema),
  dashboardController.monthlyBreakdown
);
router.get(
  "/user-metrics",
  validateQuery(yearlyMetricsQuerySchema),
  dashboardController.userMetrics
);

export default router;
