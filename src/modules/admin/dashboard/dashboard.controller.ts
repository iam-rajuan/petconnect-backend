import { Request, Response } from "express";
import { getMonthlyBreakdown, getUserMetricsByYear } from "../analytics/analytics.service";
import { MonthlyBreakdownQuery, YearlyMetricsQuery } from "../analytics/analytics.validation";

const resolveMonthYear = (query: MonthlyBreakdownQuery) => {
  const now = new Date();
  const month = query.month ?? now.getMonth() + 1;
  const year = query.year ?? now.getFullYear();
  return { month, year };
};

export const monthlyBreakdown = async (req: Request, res: Response) => {
  try {
    const query =
      (req as Request & { validatedQuery?: MonthlyBreakdownQuery }).validatedQuery || {};
    const { month, year } = resolveMonthYear(query);
    const result = await getMonthlyBreakdown(month, year);
    res.json({
      success: true,
      data: {
        month: result.month,
        year: result.year,
        currency: result.currency,
        adoption: result.adoption.revenue,
        service: result.service.revenue,
        total: result.total,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load dashboard breakdown";
    res.status(400).json({ success: false, message });
  }
};

export const userMetrics = async (req: Request, res: Response) => {
  try {
    const query =
      (req as Request & { validatedQuery?: YearlyMetricsQuery }).validatedQuery || {};
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const result = await getUserMetricsByYear(year);
    res.json({ success: true, data: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load dashboard user metrics";
    res.status(400).json({ success: false, message });
  }
};
