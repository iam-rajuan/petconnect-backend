import PetType from "../pet-types/petType.model";

const normalizeName = (name: string): string => name.trim();

type PetBreedItem = {
  name: string;
};

export const createPetBreed = async (typeId: string, name: string): Promise<PetBreedItem> => {
  const petType = await PetType.findById(typeId);
  if (!petType) {
    throw new Error("Pet type not found");
  }

  petType.breeds = petType.breeds ?? [];
  const normalized = normalizeName(name);
  if (petType.breeds.some((breed) => breed.toLowerCase() === normalized.toLowerCase())) {
    throw new Error("Pet breed already exists for this pet type");
  }

  petType.breeds.push(normalized);
  await petType.save();

  return {
    name: normalized,
  };
};

export const listBreedsByType = async (typeId: string): Promise<PetBreedItem[]> => {
  const petType = await PetType.findById(typeId);
  if (!petType) {
    throw new Error("Pet type not found");
  }

  const breeds = petType.breeds ?? [];
  return breeds
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((breed) => ({ name: breed }));
};

export const updatePetBreed = async (id: string, name: string): Promise<PetBreedItem> => {
  const petType = await PetType.findOne({ breeds: id });
  if (!petType) {
    throw new Error("Pet breed not found");
  }

  petType.breeds = petType.breeds ?? [];
  const normalized = normalizeName(name);
  const targetIndex = petType.breeds.findIndex((breed) => breed === id);
  if (targetIndex === -1) {
    throw new Error("Pet breed not found");
  }

  if (normalized.toLowerCase() !== petType.breeds[targetIndex].toLowerCase()) {
    const exists = petType.breeds.some(
      (breed) => breed.toLowerCase() === normalized.toLowerCase()
    );
    if (exists) {
      throw new Error("Pet breed already exists for this pet type");
    }
  }

  petType.breeds[targetIndex] = normalized;
  await petType.save();
  return {
    name: normalized,
  };
};

export const deletePetBreed = async (id: string): Promise<void> => {
  const petType = await PetType.findOne({ breeds: id });
  if (!petType) {
    throw new Error("Pet breed not found");
  }
  petType.breeds = petType.breeds ?? [];
  const targetIndex = petType.breeds.findIndex((breed) => breed === id);
  if (targetIndex === -1) {
    throw new Error("Pet breed not found");
  }
  petType.breeds.splice(targetIndex, 1);
  await petType.save();
};
