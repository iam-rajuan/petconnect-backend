import mongoose from "mongoose";
import PetType, { IPetType } from "./petType.model";

const MAX_PET_TYPES = 7;

const normalizeName = (name: string): { name: string; slug: string } => {
  const trimmed = name.trim();
  return { name: trimmed, slug: trimmed.toLowerCase() };
};

export const createPetType = async (name: string): Promise<IPetType> => {
  const count = await PetType.countDocuments();
  if (count >= MAX_PET_TYPES) {
    throw new Error(`Pet type limit reached (max ${MAX_PET_TYPES})`);
  }

  const { name: normalized, slug } = normalizeName(name);
  const existing = await PetType.findOne({ slug });
  if (existing) {
    throw new Error("Pet type already exists");
  }

  return PetType.create({ name: normalized, slug });
};

type PetTypeListItem = {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
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
    slug: petType.slug,
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

  const { name: normalized, slug } = normalizeName(name);
  if (slug !== petType.slug) {
    const existing = await PetType.findOne({ slug, _id: { $ne: id } });
    if (existing) {
      throw new Error("Pet type already exists");
    }
  }

  petType.name = normalized;
  petType.slug = slug;
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
