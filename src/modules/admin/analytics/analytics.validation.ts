import { z } from "zod";

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

export const monthlyBreakdownQuerySchema = z.object({
  month: z.preprocess(toNumber, z.number().int().min(1).max(12)).optional(),
  year: z.preprocess(toNumber, z.number().int().min(2000).max(2100)).optional(),
});

export const yearlyMetricsQuerySchema = z.object({
  year: z.preprocess(toNumber, z.number().int().min(2000).max(2100)).optional(),
});

export type MonthlyBreakdownQuery = z.infer<typeof monthlyBreakdownQuerySchema>;
export type YearlyMetricsQuery = z.infer<typeof yearlyMetricsQuerySchema>;
