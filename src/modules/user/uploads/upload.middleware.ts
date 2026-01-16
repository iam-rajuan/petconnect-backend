import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const allowedImages = ["image/png", "image/jpg", "image/jpeg", "image/webp"];
const allowedDocuments = [...allowedImages, "application/pdf"];

const storage = multer.memoryStorage();

const createFileFilter =
  (allowed: string[], errorMessage: string) =>
  (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (allowed.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error(errorMessage));
  };

const uploadImages = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: createFileFilter(allowedImages, "Only png, jpg, jpeg, and webp images are allowed"),
});

const uploadDocs = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: createFileFilter(
    allowedDocuments,
    "Only pdf, png, jpg, jpeg, and webp files are allowed"
  ),
});

export const uploadSingleImage = uploadImages.single("file");
export const uploadMultipleImages = uploadImages.array("files", 5);
export const uploadPetCreateImages = uploadImages.array("files", 3);
export const uploadPetCreateMedia = uploadImages.fields([
  { name: "avatar", maxCount: 1 },
  { name: "files", maxCount: 3 },
]);
export const uploadDocument = uploadDocs.single("file");
export const uploadPetHealthFiles = uploadDocs.array("files", 3);
export const uploadPetHealthRecord = uploadDocs.any();
export const uploadMessageAttachments = uploadDocs.array("files", 5);
