import { Request, Response } from "express";
import { AuthRequest } from "../../../middlewares/auth.middleware";
import * as petsService from "./pets.service";
import * as uploadsService from "../uploads/uploads.service";
import { toPetResponse } from "./pets.mapper";
import { HealthRecordType, IHealthRecord } from "./pets.model";

const normalizeStatus = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
};

const normalizeType = (value: unknown): HealthRecordType | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("tick")) return "tick_flea";
  if (normalized.includes("flea")) return "tick_flea";
  return normalized.replace(/\s+/g, "_") as HealthRecordType;
};

const pickDefined = (value: Record<string, unknown>) => {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
};

const matchesAttachment = (attachment: string, target: string) =>
  attachment === target || attachment.endsWith(target);

const requireUser = (req: AuthRequest, res: Response): string | null => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return req.user.id;
};

export const createPet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | Express.Multer.File[]
      | undefined;
    const photoFiles = Array.isArray(files)
      ? files
      : (files?.files as Express.Multer.File[] | undefined);
    const avatarFiles = Array.isArray(files)
      ? undefined
      : (files?.avatar as Express.Multer.File[] | undefined);

    if (!photoFiles || photoFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one pet photo is required",
      });
    }

    const photoUploads = await Promise.all(
      photoFiles.map((file) =>
        uploadsService.uploadFileToS3(file.buffer, file.mimetype, "pets/photos")
      )
    );
    const avatarUpload = avatarFiles?.[0]
      ? await uploadsService.uploadFileToS3(
          avatarFiles[0].buffer,
          avatarFiles[0].mimetype,
          "pets/avatars"
        )
      : undefined;

    const pet = await petsService.createPet(userId, {
      ...req.body,
      photos: photoUploads.map((item) => item.url),
      avatarUrl: avatarUpload?.url,
    });
    res.status(201).json({ success: true, data: toPetResponse(pet) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create pet";
    res.status(400).json({ success: false, message });
  }
};

export const getMyPets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const pets = await petsService.findPetsByOwner(userId);
    res.json({ success: true, data: pets.map(toPetResponse) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch pets";
    res.status(400).json({ success: false, message });
  }
};

export const getPetById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const pet = await petsService.findPetById(userId, req.params.id);
    res.json({ success: true, data: toPetResponse(pet) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pet not found";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const updatePet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | Express.Multer.File[]
      | undefined;
    const photoFiles = Array.isArray(files)
      ? files
      : (files?.files as Express.Multer.File[] | undefined);
    const avatarFiles = Array.isArray(files)
      ? undefined
      : (files?.avatar as Express.Multer.File[] | undefined);

    const hasNewPhotos = Array.isArray(photoFiles) && photoFiles.length > 0;
    const hasNewAvatar = Array.isArray(avatarFiles) && avatarFiles.length > 0;
    const keepPhotos = req.body.keepPhotos as string[] | undefined;
    const deletePhotos = req.body.deletePhotos as string[] | undefined;
    const hasKeepPhotos = Array.isArray(keepPhotos) && keepPhotos.length > 0;
    const hasDeletePhotos = Array.isArray(deletePhotos) && deletePhotos.length > 0;
    const hasPhotoListMutation = hasKeepPhotos || hasDeletePhotos;

    if (hasNewPhotos || hasNewAvatar || hasPhotoListMutation) {
      const existingPet = await petsService.findPetById(userId, req.params.id);
      const uploadedPhotos = hasNewPhotos
        ? await Promise.all(
            photoFiles.map((file) =>
              uploadsService.uploadFileToS3(file.buffer, file.mimetype, "pets/photos")
            )
          )
        : [];
      const uploadedAvatar = hasNewAvatar
        ? await uploadsService.uploadFileToS3(
            avatarFiles[0].buffer,
            avatarFiles[0].mimetype,
            "pets/avatars"
          )
        : undefined;

      const matchesPhoto = (photo: string, target: string) =>
        photo === target || photo.endsWith(target);
      const uploadedPhotoUrls = uploadedPhotos.map((item) => item.url);
      const currentPhotos = existingPet.photos || [];
      const shouldReplaceAllPhotos = hasNewPhotos && !hasPhotoListMutation;
      let nextPhotos = shouldReplaceAllPhotos ? [] : currentPhotos.slice();

      if (hasKeepPhotos) {
        nextPhotos = nextPhotos.filter((photo) =>
          keepPhotos.some((keep) => matchesPhoto(photo, keep))
        );
      }
      if (hasDeletePhotos) {
        nextPhotos = nextPhotos.filter(
          (photo) => !deletePhotos.some((remove) => matchesPhoto(photo, remove))
        );
      }
      if (hasNewPhotos) {
        nextPhotos = shouldReplaceAllPhotos
          ? uploadedPhotoUrls
          : [...nextPhotos, ...uploadedPhotoUrls];
      }

      const previousAvatar = hasNewAvatar ? existingPet.avatarUrl : undefined;

      try {
        const removedPhotos = currentPhotos.filter(
          (photo) => !nextPhotos.some((next) => matchesPhoto(photo, next))
        );
        if (removedPhotos.length > 0) {
          await Promise.all(
            removedPhotos
              .filter((photo) => photo.includes(".amazonaws.com/"))
              .map((photo) =>
                uploadsService.deleteFileFromS3(uploadsService.extractKeyFromUrl(photo))
              )
          );
        }
        if (previousAvatar && previousAvatar.includes(".amazonaws.com/")) {
          await uploadsService.deleteFileFromS3(uploadsService.extractKeyFromUrl(previousAvatar));
        }
      } catch (err) {
        await Promise.all(
          uploadedPhotos.map((item) =>
            uploadsService.deleteFileFromS3(item.key).catch(() => undefined)
          )
        );
        if (uploadedAvatar) {
          await uploadsService.deleteFileFromS3(uploadedAvatar.key).catch(() => undefined);
        }
        throw err;
      }

      if (hasNewPhotos || hasPhotoListMutation) req.body.photos = nextPhotos;
      if (hasNewAvatar) req.body.avatarUrl = uploadedAvatar?.url;
    }

    const pet = await petsService.updatePet(userId, req.params.id, req.body);
    res.json({ success: true, data: toPetResponse(pet), message: "Pet updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update pet";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deletePet = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    await petsService.deletePet(userId, req.params.id);
    res.json({ success: true, message: "Pet deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete pet";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const addHealthRecord = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const files = req.files as Express.Multer.File[] | undefined;
    const uploads = await Promise.all(
      (files || []).map((file) =>
        uploadsService.uploadFileToS3(
          file.buffer,
          file.mimetype,
          `pets/${req.params.id}/health`
        )
      )
    );

    const recordDetails =
      req.body.recordDetails || {
        recordName: req.body.recordName,
        batchLotNo: req.body.batchNumber,
        otherInfo: req.body.otherInfo,
        cost: req.body.cost,
        date: req.body.date,
        nextDueDate: req.body.nextDueDate,
        reminder:
          req.body.reminderEnabled === undefined
            ? undefined
            : {
                enabled: req.body.reminderEnabled,
                offset: req.body.reminderDuration,
              },
      };

    const veterinarian =
      req.body.veterinarian || {
        designation: req.body.vetDesignation,
        name: req.body.vetName,
        clinicName: req.body.clinicName,
        licenseNo: req.body.licenseNumber,
        contact: req.body.vetContact,
      };

    const vitalSigns =
      req.body.vitalSigns || {
        weight: req.body.weight,
        weightStatus: normalizeStatus(req.body.weightStatus),
        temperature: req.body.temperature,
        temperatureStatus: normalizeStatus(req.body.temperatureStatus),
        heartRate: req.body.heartRate,
        heartRateStatus: normalizeStatus(req.body.heartRateStatus),
        respiratory: req.body.respiratoryRate,
        respiratoryRate: req.body.respiratoryRate,
        respiratoryRateStatus: normalizeStatus(req.body.respiratoryRateStatus),
        status: normalizeStatus(req.body.status),
      };

    const observation =
      req.body.observation || {
        lookupObservations: req.body.observations || [],
        clinicalNotes: req.body.clinicalNotes,
      };

    const record = {
      type: req.body.type || normalizeType(req.body.recordType),
      recordDetails,
      veterinarian,
      vitalSigns,
      observation,
      attachments: uploads.map((item) => item.url),
    };

    const pet = await petsService.addHealthRecord(userId, req.params.id, record);
    res.status(201).json({ success: true, data: toPetResponse(pet), message: "Health record added" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add health record";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const updateHealthRecord = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const pet = await petsService.findPetById(userId, req.params.id);
    const existingRecord = (pet.healthRecords || []).find(
      (record: any) => record._id?.toString() === req.params.recordId
    );
    if (!existingRecord) {
      return res.status(404).json({ success: false, message: "Health record not found" });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const uploads = await Promise.all(
      (files || []).map((file) =>
        uploadsService.uploadFileToS3(
          file.buffer,
          file.mimetype,
          `pets/${req.params.id}/health`
        )
      )
    );

    const rawType = req.body.type ?? req.body.recordType;
    const normalizedType = rawType !== undefined ? normalizeType(rawType) : undefined;
    if (rawType !== undefined && !normalizedType) {
      return res.status(400).json({ success: false, message: "Invalid record type" });
    }

    const recordDetailsInput = (req.body.recordDetails || {}) as Record<string, unknown>;
    const reminderInput = (recordDetailsInput.reminder || {}) as Record<string, unknown>;
    const reminderPatch = pickDefined({
      enabled:
        req.body.reminderEnabled !== undefined
          ? req.body.reminderEnabled
          : reminderInput.enabled,
      offset:
        req.body.reminderDuration !== undefined
          ? req.body.reminderDuration
          : reminderInput.offset,
    });

    const recordDetails = pickDefined({
      recordName:
        req.body.recordName !== undefined ? req.body.recordName : recordDetailsInput.recordName,
      batchLotNo:
        req.body.batchNumber !== undefined ? req.body.batchNumber : recordDetailsInput.batchLotNo,
      otherInfo:
        req.body.otherInfo !== undefined ? req.body.otherInfo : recordDetailsInput.otherInfo,
      cost: req.body.cost !== undefined ? req.body.cost : recordDetailsInput.cost,
      date: req.body.date !== undefined ? req.body.date : recordDetailsInput.date,
      nextDueDate:
        req.body.nextDueDate !== undefined
          ? req.body.nextDueDate
          : recordDetailsInput.nextDueDate,
      reminder: reminderPatch ?? recordDetailsInput.reminder,
    }) as Partial<IHealthRecord["recordDetails"]> | undefined;

    const veterinarianInput = (req.body.veterinarian || {}) as Record<string, unknown>;
    const veterinarian = pickDefined({
      designation:
        req.body.vetDesignation !== undefined
          ? req.body.vetDesignation
          : veterinarianInput.designation,
      name: req.body.vetName !== undefined ? req.body.vetName : veterinarianInput.name,
      clinicName:
        req.body.clinicName !== undefined ? req.body.clinicName : veterinarianInput.clinicName,
      licenseNo:
        req.body.licenseNumber !== undefined
          ? req.body.licenseNumber
          : veterinarianInput.licenseNo,
      contact: req.body.vetContact !== undefined ? req.body.vetContact : veterinarianInput.contact,
    }) as Partial<IHealthRecord["veterinarian"]> | undefined;

    const vitalSignsInput = (req.body.vitalSigns || {}) as Record<string, unknown>;
    const respiratoryRate =
      req.body.respiratoryRate !== undefined
        ? req.body.respiratoryRate
        : vitalSignsInput.respiratoryRate ?? vitalSignsInput.respiratory;
    const vitalSigns = pickDefined({
      weight: req.body.weight !== undefined ? req.body.weight : vitalSignsInput.weight,
      weightStatus:
        req.body.weightStatus !== undefined
          ? normalizeStatus(req.body.weightStatus)
          : vitalSignsInput.weightStatus,
      temperature:
        req.body.temperature !== undefined ? req.body.temperature : vitalSignsInput.temperature,
      temperatureStatus:
        req.body.temperatureStatus !== undefined
          ? normalizeStatus(req.body.temperatureStatus)
          : vitalSignsInput.temperatureStatus,
      heartRate:
        req.body.heartRate !== undefined ? req.body.heartRate : vitalSignsInput.heartRate,
      heartRateStatus:
        req.body.heartRateStatus !== undefined
          ? normalizeStatus(req.body.heartRateStatus)
          : vitalSignsInput.heartRateStatus,
      respiratoryRate,
      respiratory:
        req.body.respiratoryRate !== undefined
          ? req.body.respiratoryRate
          : vitalSignsInput.respiratory,
      respiratoryRateStatus:
        req.body.respiratoryRateStatus !== undefined
          ? normalizeStatus(req.body.respiratoryRateStatus)
          : vitalSignsInput.respiratoryRateStatus,
      status:
        req.body.status !== undefined ? normalizeStatus(req.body.status) : vitalSignsInput.status,
    }) as Partial<IHealthRecord["vitalSigns"]> | undefined;

    const observationInput = (req.body.observation || {}) as Record<string, unknown>;
    const observation = pickDefined({
      lookupObservations:
        req.body.observations !== undefined
          ? req.body.observations
          : observationInput.lookupObservations,
      clinicalNotes:
        req.body.clinicalNotes !== undefined
          ? req.body.clinicalNotes
          : observationInput.clinicalNotes,
    }) as Partial<IHealthRecord["observation"]> | undefined;

    const deleteAttachments = (req.body.deleteAttachments || []) as string[];
    const existingAttachments = existingRecord.attachments || [];
    const filteredAttachments =
      deleteAttachments.length > 0
        ? existingAttachments.filter(
            (item) => !deleteAttachments.some((target) => matchesAttachment(item, target))
          )
        : existingAttachments.slice();
    const nextAttachments = [...filteredAttachments, ...uploads.map((item) => item.url)];

    const payload: {
      type?: HealthRecordType;
      recordDetails?: Partial<IHealthRecord["recordDetails"]>;
      veterinarian?: Partial<IHealthRecord["veterinarian"]>;
      vitalSigns?: Partial<IHealthRecord["vitalSigns"]>;
      observation?: Partial<IHealthRecord["observation"]>;
      attachments?: string[];
    } = {};

    if (normalizedType !== undefined) payload.type = normalizedType;
    if (recordDetails !== undefined) payload.recordDetails = recordDetails;
    if (veterinarian !== undefined) payload.veterinarian = veterinarian;
    if (vitalSigns !== undefined) payload.vitalSigns = vitalSigns;
    if (observation !== undefined) payload.observation = observation;
    if (deleteAttachments.length > 0 || uploads.length > 0) {
      payload.attachments = nextAttachments;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: "No updates provided" });
    }

    if (deleteAttachments.length > 0) {
      const removedAttachments = existingAttachments.filter(
        (item) => !nextAttachments.some((next) => matchesAttachment(item, next))
      );
      try {
        await Promise.all(
          removedAttachments
            .filter((item) => item.includes(".amazonaws.com/"))
            .map((item) =>
              uploadsService.deleteFileFromS3(uploadsService.extractKeyFromUrl(item))
            )
        );
      } catch (err) {
        await Promise.all(
          uploads.map((item) =>
            uploadsService.deleteFileFromS3(item.key).catch(() => undefined)
          )
        );
        throw err;
      }
    }

    const record = await petsService.updateHealthRecord(
      userId,
      req.params.id,
      req.params.recordId,
      payload
    );
    res.json({ success: true, data: record, message: "Health record updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update health record";
    const status =
      message === "Pet not found" || message === "Health record not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

const addTypedHealthRecord =
  (type: string) =>
  async (req: AuthRequest, res: Response) => {
    req.body.type = type;
    await addHealthRecord(req, res);
  };

export const addVaccinationHealthRecord = addTypedHealthRecord("vaccination");
export const addCheckupHealthRecord = addTypedHealthRecord("checkup");
export const addMedicationHealthRecord = addTypedHealthRecord("medication");
export const addTickFleaHealthRecord = addTypedHealthRecord("tick_flea");
export const addSurgeryHealthRecord = addTypedHealthRecord("surgery");
export const addDentalHealthRecord = addTypedHealthRecord("dental");
export const addOtherHealthRecord = addTypedHealthRecord("other");

export const listHealthRecords = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const validatedQuery = (req as Request & { validatedQuery?: { type?: string } })
      .validatedQuery;
    const type = validatedQuery?.type;
    const records = await petsService.listHealthRecords(userId, req.params.id, type);
    res.json({ success: true, data: records });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch health records";
    const status = message === "Pet not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deleteHealthRecord = async (req: AuthRequest, res: Response) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;
    await petsService.deleteHealthRecord(userId, req.params.id, req.params.recordId);
    res.json({ success: true, message: "Health record deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete health record";
    const status =
      message === "Pet not found" || message === "Health record not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};
