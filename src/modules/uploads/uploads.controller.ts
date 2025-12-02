import { Response } from "express";
import { z, ZodError } from "zod";
import { AuthRequest } from "../../middlewares/auth.middleware";
import * as uploadsService from "./uploads.service";
import * as petsService from "../pets/pets.service";
import * as usersService from "../users/users.service";

const documentSchema = z.object({
  title: z.string().trim().min(1, "Document title is required"),
});

const requireUser = (req: AuthRequest, res: Response): string | null => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return req.user.id;
};

export const uploadUserAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const { url, key } = await uploadsService.uploadFileToS3(
      req.file.buffer,
      req.file.mimetype,
      "users/avatars"
    );
    const user = await usersService.updateUserAvatar(userId, url);

    res.status(201).json({
      success: true,
      message: "Avatar uploaded",
      data: { avatarUrl: user.avatarUrl, url, key },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload avatar";
    res.status(400).json({ success: false, message });
  }
};

export const uploadPetAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const petId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const pet = await petsService.ensureOwnedPet(userId, petId);
    const { url, key } = await uploadsService.uploadFileToS3(
      req.file.buffer,
      req.file.mimetype,
      `pets/${petId}/avatar`
    );

    pet.avatarUrl = url;
    await pet.save();

    res.status(201).json({
      success: true,
      message: "Pet avatar uploaded",
      data: { avatarUrl: pet.avatarUrl, url, key },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload pet avatar";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const uploadPetPhoto = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const petId = req.params.id;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "At least one photo is required" });
    }

    await petsService.ensureOwnedPet(userId, petId);

    const uploads = await Promise.all(
      files.map((file) =>
        uploadsService.uploadFileToS3(file.buffer, file.mimetype, `pets/${petId}/photos`)
      )
    );

    await Promise.all(uploads.map(({ url }) => petsService.addPetPhoto(userId, petId, url)));

    res.status(201).json({
      success: true,
      message: "Pet photos uploaded",
      data: { photos: uploads },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload pet photo";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const uploadPetDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const petId = req.params.id;

    const parsed = documentSchema.parse(req.body);

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Document file is required" });
    }

    await petsService.ensureOwnedPet(userId, petId);

    const { url, key } = await uploadsService.uploadFileToS3(
      req.file.buffer,
      req.file.mimetype,
      `pets/${petId}/documents`
    );

    const record = {
      title: parsed.title,
      documentUrl: url,
      uploadedAt: new Date(),
    };

    await petsService.addPetDocument(userId, petId, record);

    res.status(201).json({
      success: true,
      message: "Medical document uploaded",
      data: { document: { ...record, key } },
    });
  } catch (err) {
    const message =
      err instanceof ZodError
        ? err.issues?.[0]?.message || "Validation failed"
        : err instanceof Error
          ? err.message
          : "Failed to upload document";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deletePetPhoto = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { id: petId, fileId } = req.params;

    const pet = await petsService.ensureOwnedPet(userId, petId);
    const storedPhoto = pet.photos.find(
      (photo) => photo === fileId || uploadsService.extractKeyFromUrl(photo) === fileId
    );

    if (!storedPhoto) {
      return res.status(404).json({ success: false, message: "Photo not found" });
    }

    const key = uploadsService.extractKeyFromUrl(storedPhoto);
    await uploadsService.deleteFileFromS3(key);
    await petsService.removePetPhoto(userId, petId, storedPhoto);

    res.json({ success: true, message: "Photo deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete pet photo";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deletePetDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const { id: petId, fileId } = req.params;

    const pet = await petsService.ensureOwnedPet(userId, petId);
    const storedRecord = pet.medicalRecords.find(
      (record) =>
        record.documentUrl === fileId || uploadsService.extractKeyFromUrl(record.documentUrl) === fileId
    );

    if (!storedRecord) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const key = uploadsService.extractKeyFromUrl(storedRecord.documentUrl);
    await uploadsService.deleteFileFromS3(key);
    await petsService.removePetDocument(userId, petId, storedRecord.documentUrl);

    res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete document";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};
