import { Request, Response } from "express";
import { AuthRequest } from "../../../middlewares/auth.middleware";
import * as adoptionService from "./adoption.service";
import { BasketItemInput, CheckoutInput, ListingQueryInput } from "./adoption.validation";

const requireUser = (req: AuthRequest, res: Response): { id: string; role: string } | null => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return { id: req.user.id, role: req.user.role };
};

//adoption listing
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
    const filters = (req as Request & { validatedQuery?: ListingQueryInput }).validatedQuery || {};
    const result = await adoptionService.listAdoptionListings(filters);
    res.json({
      success: true,
      data: {
        ...result,
        data: result.data.map((listing) => ({
          id: listing._id,
          petName: listing.petName,
          petType: listing.species,
          petBreed: listing.breed || "",
          petAge: listing.age ?? null,
          petGender: listing.gender || "",
          avatarUrl: listing.avatarUrl || "",
          status: listing.status,
          price: listing.price ?? 0,
        })),
      },
    });
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
    const records = listing.healthRecords || [];
    const summary = records.reduce(
      (acc: Record<string, { count: number; lastUpdated: string }>, record) => {
        const type = record.type;
        const date = record.recordDetails?.date || "";
        const current = acc[type];
        if (!current) {
          acc[type] = { count: 1, lastUpdated: date };
        } else {
          acc[type].count += 1;
          if (date && (!current.lastUpdated || date > current.lastUpdated)) {
            acc[type].lastUpdated = date;
          }
        }
        return acc;
      },
      {}
    );

    res.json({
      success: true,
      data: {
        id: listing._id,
        petName: listing.petName,
        petType: listing.species,
        petBreed: listing.breed || "",
        petAge: listing.age ?? null,
        petGender: listing.gender || "",
        weightLbs: listing.weightLbs ?? null,
        avatarUrl: listing.avatarUrl || "",
        photos: listing.photos || [],
        status: listing.status,
        price: listing.price ?? 0,
        vaccinated: listing.vaccinated ?? false,
        neutered: listing.neutered ?? false,
        trained: listing.trained ?? false,
        shelterName: listing.shelterName || listing.contactName || "",
        shelterPhone: listing.shelterPhone || listing.contactPhone || "",
        aboutPet: listing.aboutPet || listing.description || "",
        personality: listing.personality || [],
        healthSummary: summary,
      },
    });
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

export const requestAdoption = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const request = await adoptionService.createAdoptionRequest(req.params.id, user.id);
    res.status(201).json({
      success: true,
      data: request,
      message: "Adoption request submitted",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit adoption request";
    const status =
      message === "Adoption listing not found" || message === "Adoption listing is already adopted"
        ? 404
        : 400;
    res.status(status).json({ success: false, message });
  }
};

export const listHealthRecords = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const records = await adoptionService.listHealthRecords(req.params.id, type);
    res.json({
      success: true,
      data: records.map((record: any) => ({
        id: record._id,
        type: record.type,
        recordName: record.recordDetails?.recordName || "",
        lastUpdated: record.recordDetails?.date || "",
        reminder: record.recordDetails?.reminder || null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch health records";
    const status = message === "Adoption listing not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const getHealthRecord = async (req: Request, res: Response) => {
  try {
    const record = await adoptionService.getHealthRecord(req.params.id, req.params.recordId);
    res.json({ success: true, data: record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health record not found";
    const status =
      message === "Adoption listing not found" || message === "Health record not found"
        ? 404
        : 400;
    res.status(status).json({ success: false, message });
  }
};

export const getBasket = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const basket = await adoptionService.getOrCreateBasket(user.id);
    const items = (basket.items || []).map((item: any) => {
      const listing = item.listing || {};
      return {
        listingId: listing._id || item.listing,
        petName: listing.petName || "",
        petType: listing.species || "",
        petBreed: listing.breed || "",
        petAge: listing.age ?? null,
        avatarUrl: listing.avatarUrl || "",
        price: listing.price ?? 0,
        status: listing.status || "",
      };
    });

    res.json({ success: true, data: { items } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch basket";
    res.status(400).json({ success: false, message });
  }
};

export const addBasketItem = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const payload = req.body as BasketItemInput;
    const basket = await adoptionService.addToBasket(user.id, payload.listingId);
    res.json({ success: true, data: basket, message: "Added to basket" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add to basket";
    res.status(400).json({ success: false, message });
  }
};

export const removeBasketItem = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const basket = await adoptionService.removeFromBasket(user.id, req.params.listingId);
    res.json({ success: true, data: basket, message: "Removed from basket" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove from basket";
    res.status(400).json({ success: false, message });
  }
};

export const checkoutBasket = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const payload = req.body as CheckoutInput;
    const { order, clientSecret } = await adoptionService.createAdoptionOrder({
      userId: user.id,
      listingIds: payload.listingIds,
      customer: payload.customer,
    });
    res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
        paymentIntentId: order.paymentIntentId,
        clientSecret,
        customer: order.customerInfo,
        subtotal: order.subtotal,
        taxPercent: order.taxPercent,
        taxAmount: order.taxAmount,
        processingFee: order.processingFee,
        shippingFee: order.shippingFee,
        total: order.total,
        items: order.items,
      },
      message: "Checkout created",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to checkout";
    res.status(400).json({ success: false, message });
  }
};

export const getAdoptionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const orders = await adoptionService.getUserOrders(user.id);
    const data = orders.map((order) => ({
      orderId: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paidAt: order.paidAt ?? null,
      createdAt: order.createdAt,
      currency: order.currency,
      subtotal: order.subtotal,
      taxPercent: order.taxPercent,
      taxAmount: order.taxAmount,
      processingFee: order.processingFee,
      shippingFee: order.shippingFee,
      total: order.total,
      items: (order.items || []).map((item) => ({
        listingId: item.listing,
        petName: item.petName,
        petType: item.petType,
        petBreed: item.petBreed || "",
        petAge: item.petAge ?? null,
        petGender: item.petGender || "",
        avatarUrl: item.avatarUrl || "",
        price: item.price ?? 0,
      })),
    }));

    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch adoption history";
    res.status(400).json({ success: false, message });
  }
};
