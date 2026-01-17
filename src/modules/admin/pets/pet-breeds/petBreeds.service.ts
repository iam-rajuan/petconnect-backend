import mongoose from "mongoose";
import PetType from "../pet-types/petType.model";

const normalizeName = (name: string): { name: string; slug: string } => {
  const trimmed = name.trim();
  return { name: trimmed, slug: trimmed.toLowerCase() };
};

type PetBreedItem = {
  _id: string;
  name: string;
  slug: string;
  createdAt: Date;
};

export const createPetBreed = async (typeId: string, name: string): Promise<PetBreedItem> => {
  const petType = await PetType.findById(typeId);
  if (!petType) {
    throw new Error("Pet type not found");
  }

  const { name: normalized, slug } = normalizeName(name);
  if (petType.breeds.some((breed) => breed.slug === slug)) {
    throw new Error("Pet breed already exists for this pet type");
  }

  petType.breeds.push({
    _id: new mongoose.Types.ObjectId(),
    name: normalized,
    slug,
    createdAt: new Date(),
  });
  await petType.save();

  const created = petType.breeds[petType.breeds.length - 1];
  return {
    _id: String(created._id),
    name: created.name,
    slug: created.slug,
    createdAt: created.createdAt,
  };
};

export const listBreedsByType = async (typeId: string): Promise<PetBreedItem[]> => {
  const petType = await PetType.findById(typeId);
  if (!petType) {
    throw new Error("Pet type not found");
  }

  return petType.breeds
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((breed) => ({
      _id: String(breed._id),
      name: breed.name,
      slug: breed.slug,
      createdAt: breed.createdAt,
    }));
};

export const updatePetBreed = async (id: string, name: string): Promise<PetBreedItem> => {
  const petType = await PetType.findOne({ "breeds._id": id });
  if (!petType) {
    throw new Error("Pet breed not found");
  }

  const { name: normalized, slug } = normalizeName(name);
  const targetIndex = petType.breeds.findIndex(
    (breed) => String(breed._id) === String(id)
  );
  if (targetIndex === -1) {
    throw new Error("Pet breed not found");
  }
  const target = petType.breeds[targetIndex];

  if (slug !== target.slug) {
    const exists = petType.breeds.some((breed) => breed.slug === slug);
    if (exists) {
      throw new Error("Pet breed already exists for this pet type");
    }
  }

  target.name = normalized;
  target.slug = slug;
  await petType.save();
  return {
    _id: String(target._id),
    name: target.name,
    slug: target.slug,
    createdAt: target.createdAt,
  };
};

export const deletePetBreed = async (id: string): Promise<void> => {
  const petType = await PetType.findOne({ "breeds._id": id });
  if (!petType) {
    throw new Error("Pet breed not found");
  }
  const targetIndex = petType.breeds.findIndex(
    (breed) => String(breed._id) === String(id)
  );
  if (targetIndex === -1) {
    throw new Error("Pet breed not found");
  }
  petType.breeds.splice(targetIndex, 1);
  await petType.save();
};
