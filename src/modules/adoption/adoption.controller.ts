import { Request, Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as adoptionService from "./adoption.service";
import { ListingQueryInput } from "./adoption.validation";

const requireUser = (req: AuthRequest, res: Response): { id: string; role: string } | null => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return { id: req.user.id, role: req.user.role };
};

export const createAdoptionListing = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const listing = await adoptionService.createAdoptionListing(user.id, req.body);
    res.status(201).json({ success: true, data: listing });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create adoption listing";
    res.status(400).json({ success: false, message });
  }
};

// Public list endpoint with filters
export const listAdoptionListings = async (req: Request, res: Response) => {
  try {
    const filters = req.query as unknown as ListingQueryInput;
    const result = await adoptionService.listAdoptionListings(filters);
    res.json({ success: true, data: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch adoption listings";
    res.status(400).json({ success: false, message });
  }
};

// Public detail endpoint
export const getAdoptionListingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const listing = await adoptionService.getAdoptionListingById(id);
    res.json({ success: true, data: listing });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Adoption listing not found";
    const status = message === "Adoption listing not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

// For users to see their own listings
export const getMyAdoptionListings = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const listings = await adoptionService.listUserAdoptionListings(user.id);
    res.json({ success: true, data: listings });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch user adoption listings";
    res.status(400).json({ success: false, message });
  }
};

// Admin-only: update status (available/pending/adopted)
export const updateAdoptionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: "available" | "pending" | "adopted" };

    const listing = await adoptionService.updateAdoptionStatus(id, status);
    res.json({ success: true, data: listing, message: "Adoption status updated" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update adoption status";
    res.status(400).json({ success: false, message });
  }
};

export const deleteAdoptionListing = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    await adoptionService.deleteAdoptionListing(id, user.id, user.role === "admin");

    res.json({ success: true, message: "Adoption listing deleted" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete adoption listing";
    const status =
      message === "Adoption listing not found or not authorized to delete" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};
