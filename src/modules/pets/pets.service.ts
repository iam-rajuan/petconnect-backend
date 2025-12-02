import Pet, { IMedicalRecord, IPet } from "./pets.model";
import { CreatePetInput, UpdatePetInput } from "./pets.validation";

export const ensureOwnedPet = async (ownerId: string, petId: string): Promise<IPet> => {
  const pet = await Pet.findOne({ _id: petId, owner: ownerId });
  if (!pet) {
    throw new Error("Pet not found");
  }
  return pet;
};

export const createPet = async (ownerId: string, payload: CreatePetInput): Promise<IPet> => {
  const pet = await Pet.create({
    owner: ownerId,
    name: payload.name.trim(),
    species: payload.species.trim(),
    breed: payload.breed?.trim(),
    age: payload.age,
    gender: payload.gender,
    bio: payload.bio?.trim(),
  });
  return pet;
};

export const findPetsByOwner = async (ownerId: string): Promise<IPet[]> => {
  return Pet.find({ owner: ownerId }).sort({ createdAt: -1 });
};

export const findPetById = async (ownerId: string, petId: string): Promise<IPet> => {
  return ensureOwnedPet(ownerId, petId);
};

export const updatePet = async (
  ownerId: string,
  petId: string,
  payload: UpdatePetInput
): Promise<IPet> => {
  const pet = await ensureOwnedPet(ownerId, petId);

  if (payload.name !== undefined) pet.name = payload.name.trim();
  if (payload.species !== undefined) pet.species = payload.species.trim();
  if (payload.breed !== undefined) pet.breed = payload.breed.trim();
  if (payload.age !== undefined) pet.age = payload.age;
  if (payload.gender !== undefined) pet.gender = payload.gender;
  if (payload.bio !== undefined) pet.bio = payload.bio.trim();

  await pet.save();
  return pet;
};

export const deletePet = async (ownerId: string, petId: string): Promise<void> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  await Pet.deleteOne({ _id: pet._id });
};

export const addPetPhoto = async (
  ownerId: string,
  petId: string,
  photoUrl: string
): Promise<IPet> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  pet.photos.push(photoUrl);
  await pet.save();
  return pet;
};

export const removePetPhoto = async (
  ownerId: string,
  petId: string,
  keyOrUrl: string
): Promise<IPet> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  const index = pet.photos.findIndex((photo) => photo === keyOrUrl || photo.endsWith(keyOrUrl));
  if (index === -1) {
    throw new Error("Photo not found");
  }
  pet.photos.splice(index, 1);
  await pet.save();
  return pet;
};

export const addPetDocument = async (
  ownerId: string,
  petId: string,
  doc: IMedicalRecord
): Promise<IPet> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  pet.medicalRecords.push(doc);
  await pet.save();
  return pet;
};

export const removePetDocument = async (
  ownerId: string,
  petId: string,
  keyOrUrl: string
): Promise<IPet> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  const index = pet.medicalRecords.findIndex(
    (record) => record.documentUrl === keyOrUrl || record.documentUrl.endsWith(keyOrUrl)
  );
  if (index === -1) {
    throw new Error("Document not found");
  }
  pet.medicalRecords.splice(index, 1);
  await pet.save();
  return pet;
};
