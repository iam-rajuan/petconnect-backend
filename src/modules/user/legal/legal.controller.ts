import { Request, Response } from "express";
import * as legalService from "./legal.service";

export const getTerms = async (_req: Request, res: Response) => {
  try {
    const terms = await legalService.getTerms();
    res.json({
      success: true,
      data: {
        content: terms?.content ?? "",
        updatedAt: terms?.updatedAt ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch terms";
    res.status(400).json({ success: false, message });
  }
};

export const getPrivacy = async (_req: Request, res: Response) => {
  try {
    const policy = await legalService.getPrivacy();
    res.json({
      success: true,
      data: {
        content: policy?.content ?? "",
        updatedAt: policy?.updatedAt ?? null,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch privacy policy";
    res.status(400).json({ success: false, message });
  }
};
