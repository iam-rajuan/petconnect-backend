import { Request, Response } from "express";
import * as adoptionService from "./adoption.service";
import {
  toAdminAdoptionListItem,
  toAdminAdoptionRequestListItem,
  toAdminAdoptionSummaryItem,
} from "./adoption.mapper";
import * as uploadsService from "../../user/uploads/uploads.service";

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "yes", "1"].includes(value.toLowerCase());
  }
  return false;
};

const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      // fall through
    }
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const parseHealthRecords = (value: unknown, healthFiles: Express.Multer.File[]): any[] => {
  if (!value) return [];
  let parsed: any[] = [];
  if (typeof value === "string") {
    parsed = JSON.parse(value);
  } else if (Array.isArray(value)) {
    parsed = value;
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.map((record) => {
    const indexes = Array.isArray(record.fileIndexes) ? record.fileIndexes : [];
    const attachments = indexes
      .map((idx: number) => healthFiles[idx])
      .filter(Boolean)
      .slice(0, 3);
    return {
      type: record.type,
      recordDetails: record.recordDetails,
      veterinarian: record.veterinarian,
      vitalSigns: record.vitalSigns,
      attachments,
    };
  });
};

const parseJsonField = (value: unknown, fallback: any) => {
  if (!value) return fallback;
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
};

export const listAdoptions = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const listings = await adoptionService.listAdoptionListings(status);
    res.json({ success: true, data: listings.map(toAdminAdoptionListItem) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch adoption listings";
    res.status(400).json({ success: false, message });
  }
};

export const listAdoptionSummary = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const listings = await adoptionService.listAdoptionListings(status);
    res.json({ success: true, data: listings.map(toAdminAdoptionSummaryItem) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch adoption listings";
    res.status(400).json({ success: false, message });
  }
};

export const getAdoption = async (req: Request, res: Response) => {
  try {
    const listing = await adoptionService.getAdoptionListing(req.params.id);
    res.json({ success: true, data: listing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Adoption listing not found";
    const status = message === "Adoption listing not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const createAdoption = async (req: Request, res: Response) => {
  try {
    if (!req.body.petName || !req.body.petType) {
      return res.status(400).json({
        success: false,
        message: "Pet name and pet type are required",
      });
    }
    if (!req.body.shelterName || !req.body.shelterPhone) {
      return res.status(400).json({
        success: false,
        message: "Shelter name and phone are required",
      });
    }

    const files = req.files as {
      photos?: Express.Multer.File[];
      healthFiles?: Express.Multer.File[];
    };
    const photos = files?.photos || [];
    if (photos.length === 0) {
      return res.status(400).json({ success: false, message: "At least 1 photo is required" });
    }
    if (photos.length > 3) {
      return res.status(400).json({ success: false, message: "Max 3 photos allowed" });
    }

    const avatarIndex = Math.max(0, Number(req.body.avatarIndex || 0));
    const photoUploads = await Promise.all(
      photos.map((file) =>
        uploadsService.uploadFileToS3(file.buffer, file.mimetype, "adoption/photos")
      )
    );
    const avatarUrl = photoUploads[avatarIndex]?.url || photoUploads[0]?.url;

    const healthFiles = files?.healthFiles || [];
    let healthRecords = [];
    try {
      healthRecords = parseHealthRecords(req.body.healthRecords, healthFiles);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid healthRecords format",
      });
    }
    for (const record of healthRecords) {
      const uploads = await Promise.all(
        (record.attachments || []).map((file: Express.Multer.File) =>
          uploadsService.uploadFileToS3(file.buffer, file.mimetype, "adoption/health")
        )
      );
      record.attachments = uploads.map((item) => item.url);
    }

    const listing = await adoptionService.createAdoptionListing({
      createdByRole: "admin",
      title: req.body.petName || req.body.title || "Adoption Listing",
      description: req.body.aboutPet || req.body.description || "",
      location: req.body.location || "N/A",
      status: "available",
      petName: req.body.petName,
      species: req.body.petType,
      breed: req.body.breed,
      age: req.body.petAge ? Number(req.body.petAge) : undefined,
      weightLbs: req.body.weightLbs ? Number(req.body.weightLbs) : undefined,
      gender: req.body.gender,
      trained: parseBoolean(req.body.trained),
      vaccinated: parseBoolean(req.body.vaccinated),
      neutered: parseBoolean(req.body.neutered),
      personality: parseStringArray(req.body.personality).slice(0, 5),
      aboutPet: req.body.aboutPet,
      avatarUrl,
      photos: photoUploads.map((item) => item.url),
      contactName: req.body.shelterName || "Shelter",
      contactPhone: req.body.shelterPhone,
      shelterName: req.body.shelterName,
      shelterPhone: req.body.shelterPhone,
      healthRecords,
    });

    res.status(201).json({ success: true, data: listing, message: "Adoption listing created" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create adoption listing";
    res.status(400).json({ success: false, message });
  }
};

export const updateAdoption = async (req: Request, res: Response) => {
  try {
    const payload = { ...req.body };
    if (payload.petAge) payload.age = Number(payload.petAge);
    if (payload.weightLbs) payload.weightLbs = Number(payload.weightLbs);
    const listing = await adoptionService.updateAdoptionListing(req.params.id, payload);
    res.json({ success: true, data: listing, message: "Adoption listing updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update adoption listing";
    const status = message === "Adoption listing not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const updateAdoptionStatus = async (req: Request, res: Response) => {
  try {
    const listing = await adoptionService.updateAdoptionListing(req.params.id, {
      status: req.body.status,
    });
    res.json({ success: true, data: listing, message: "Adoption status updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update adoption status";
    const status = message === "Adoption listing not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deleteAdoption = async (req: Request, res: Response) => {
  try {
    await adoptionService.deleteAdoptionListing(req.params.id);
    res.json({ success: true, message: "Adoption listing deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete adoption listing";
    const status = message === "Adoption listing not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const listAdoptionRequests = async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string | undefined) || "all";
    const requests = await adoptionService.listAdoptionRequests(status);
    res.json({ success: true, data: requests.map(toAdminAdoptionRequestListItem) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch adoption requests";
    res.status(400).json({ success: false, message });
  }
};

export const getAdoptionRequest = async (req: Request, res: Response) => {
  try {
    const request = await adoptionService.getAdoptionRequest(req.params.id);
    res.json({ success: true, data: request });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Adoption request not found";
    const status = message === "Adoption request not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const updateAdoptionRequestStatus = async (req: Request, res: Response) => {
  try {
    const request = await adoptionService.updateAdoptionRequestStatus(
      req.params.id,
      req.body.status
    );
    res.json({ success: true, data: request, message: "Adoption request updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update adoption request";
    const status = message === "Adoption request not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deleteAdoptionRequest = async (req: Request, res: Response) => {
  try {
    await adoptionService.deleteAdoptionRequest(req.params.id);
    res.json({ success: true, message: "Adoption request deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete adoption request";
    const status = message === "Adoption request not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const addHealthRecord = async (req: Request, res: Response) => {
  try {
    const files = req.files as { files?: Express.Multer.File[] };
    const uploads = await Promise.all(
      (files?.files || []).map((file) =>
        uploadsService.uploadFileToS3(file.buffer, file.mimetype, "adoption/health")
      )
    );

    const record = {
      type: req.body.type,
      recordDetails: parseJsonField(req.body.recordDetails, {}),
      veterinarian: parseJsonField(req.body.veterinarian, {}),
      vitalSigns: parseJsonField(req.body.vitalSigns, {}),
      attachments: uploads.map((item) => item.url),
    };

    const listing = await adoptionService.addHealthRecord(req.params.id, record);
    res.status(201).json({ success: true, data: listing, message: "Health record added" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add health record";
    const status =
      message === "Adoption listing not found" || message === "Health record not found"
        ? 404
        : 400;
    res.status(status).json({ success: false, message });
  }
};

export const listHealthRecords = async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const records = await adoptionService.listHealthRecords(req.params.id, type);
    res.json({ success: true, data: records });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch health records";
    const status = message === "Adoption listing not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deleteHealthRecord = async (req: Request, res: Response) => {
  try {
    await adoptionService.deleteHealthRecord(req.params.id, req.params.recordId);
    res.json({ success: true, message: "Health record deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete health record";
    const status =
      message === "Adoption listing not found" || message === "Health record not found"
        ? 404
        : 400;
    res.status(status).json({ success: false, message });
  }
};
