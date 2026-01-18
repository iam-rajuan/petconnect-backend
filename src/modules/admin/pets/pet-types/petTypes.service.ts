import mongoose from "mongoose";
import PetType, { IPetType } from "./petType.model";

const MAX_PET_TYPES = 7;

const normalizeName = (name: string): string => {
  const trimmed = name.trim();
  return trimmed;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeBreeds = (breeds: string[]): string[] => {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of breeds) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    cleaned.push(trimmed);
  }
  return cleaned;
};

export const createPetType = async (name: string): Promise<IPetType> => {
  const count = await PetType.countDocuments();
  if (count >= MAX_PET_TYPES) {
    throw new Error(`Pet type limit reached (max ${MAX_PET_TYPES})`);
  }

  const normalized = normalizeName(name);
  const existing = await PetType.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
  });
  if (existing) {
    throw new Error("Pet type already exists");
  }

  return PetType.create({ name: normalized });
};

type PetTypeListItem = {
  _id: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  petBreedCount: number;
};

export const listPetTypes = async (): Promise<PetTypeListItem[]> => {
  const petTypes = await PetType.find()
    .sort({ name: 1 })
    .lean<IPetType[]>();

  return petTypes.map((petType) => ({
    _id: petType._id,
    name: petType.name,
    createdAt: petType.createdAt,
    updatedAt: petType.updatedAt,
    petBreedCount: petType.breeds?.length ?? 0,
  }));
};

export const updatePetType = async (id: string, name: string): Promise<IPetType> => {
  const petType = await PetType.findById(id);
  if (!petType) {
    throw new Error("Pet type not found");
  }

  const normalized = normalizeName(name);
  if (normalized.toLowerCase() !== petType.name.toLowerCase()) {
    const existing = await PetType.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, "i") },
      _id: { $ne: id },
    });
    if (existing) {
      throw new Error("Pet type already exists");
    }
  }

  petType.name = normalized;
  await petType.save();
  return petType;
};

export const updatePetBreeds = async (
  id: string,
  breeds: string[]
): Promise<IPetType> => {
  const petType = await PetType.findById(id);
  if (!petType) {
    throw new Error("Pet type not found");
  }

  petType.breeds = normalizeBreeds(breeds);
  await petType.save();
  return petType;
};

export const deletePetType = async (id: string): Promise<void> => {
  const petType = await PetType.findById(id);
  if (!petType) {
    throw new Error("Pet type not found");
  }
  await PetType.deleteOne({ _id: petType._id });
};
