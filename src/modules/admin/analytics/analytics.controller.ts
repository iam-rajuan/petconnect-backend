import { Request, Response } from "express";
import { getMonthlyBreakdown, getRevenueMetricsByYear } from "./analytics.service";
import { MonthlyBreakdownQuery, YearlyMetricsQuery } from "./analytics.validation";

const resolveMonthYear = (query: MonthlyBreakdownQuery) => {
  const now = new Date();
  const month = query.month ?? now.getMonth() + 1;
  const year = query.year ?? now.getFullYear();
  return { month, year };
};

const resolveYear = (query: YearlyMetricsQuery) => {
  const now = new Date();
  return query.year ?? now.getFullYear();
};

export const monthlyBreakdown = async (req: Request, res: Response) => {
  try {
    const query =
      (req as Request & { validatedQuery?: MonthlyBreakdownQuery }).validatedQuery || {};
    const { month, year } = resolveMonthYear(query);
    const result = await getMonthlyBreakdown(month, year);
    res.json({ success: true, data: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load monthly breakdown";
    res.status(400).json({ success: false, message });
  }
};

export const revenueMetrics = async (req: Request, res: Response) => {
  try {
    const query =
      (req as Request & { validatedQuery?: YearlyMetricsQuery }).validatedQuery || {};
    const year = resolveYear(query);
    const result = await getRevenueMetricsByYear(year);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load revenue metrics";
    res.status(400).json({ success: false, message });
  }
};
