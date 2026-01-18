import Pet, { IHealthRecord, IMedicalRecord, IPet } from "./pets.model";
import User from "../users/user.model";
import { CreatePetInput, UpdatePetInput } from "./pets.validation";

export const ensureOwnedPet = async (ownerId: string, petId: string): Promise<IPet> => {
  const pet = await Pet.findOne({ _id: petId, owner: ownerId });
  if (!pet) {
    throw new Error("Pet not found");
  }
  return pet;
};

export const createPet = async (ownerId: string, payload: CreatePetInput): Promise<IPet> => {
  const species = payload.species ?? payload.type;
  if (!species) {
    throw new Error("Pet type is required");
  }
  const personality = (payload.personality || [])
    .map((trait) => trait.trim())
    .filter(Boolean)
    .slice(0, 5);
  const about = payload.about ?? payload.bio;

  const pet = await Pet.create({
    owner: ownerId,
    name: payload.name.trim(),
    species: species.trim(),
    breed: payload.breed?.trim(),
    age: payload.age,
    weightLbs: payload.weightLbs,
    gender: payload.gender,
    trained: payload.trained,
    vaccinated: payload.vaccinated,
    neutered: payload.neutered,
    personality,
    bio: about?.trim(),
    avatarUrl: payload.avatarUrl?.trim(),
    photos: payload.photos || [],
  });
  await User.findByIdAndUpdate(ownerId, { $addToSet: { pets: pet._id } });
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
  if (payload.type !== undefined) pet.species = payload.type.trim();
  if (payload.breed !== undefined) pet.breed = payload.breed.trim();
  if (payload.age !== undefined) pet.age = payload.age;
  if (payload.weightLbs !== undefined) pet.weightLbs = payload.weightLbs;
  if (payload.gender !== undefined) pet.gender = payload.gender;
  if (payload.trained !== undefined) pet.trained = payload.trained;
  if (payload.vaccinated !== undefined) pet.vaccinated = payload.vaccinated;
  if (payload.neutered !== undefined) pet.neutered = payload.neutered;
  if (payload.personality !== undefined) {
    pet.personality = payload.personality
      .map((trait) => trait.trim())
      .filter(Boolean)
      .slice(0, 5);
  }
  if (payload.about !== undefined) pet.bio = payload.about.trim();
  if (payload.bio !== undefined) pet.bio = payload.bio.trim();
  if (payload.photos !== undefined) pet.photos = payload.photos;
  if (payload.avatarUrl !== undefined) pet.avatarUrl = payload.avatarUrl.trim();

  await pet.save();
  return pet;
};

export const deletePet = async (ownerId: string, petId: string): Promise<void> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  await Pet.deleteOne({ _id: pet._id });
  await User.findByIdAndUpdate(ownerId, { $pull: { pets: pet._id } });
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

export const addHealthRecord = async (
  ownerId: string,
  petId: string,
  record: IHealthRecord
): Promise<IPet> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  pet.healthRecords = pet.healthRecords || [];
  pet.healthRecords.push(record);
  await pet.save();
  return pet;
};

type HealthRecordUpdate = Omit<
  Partial<IHealthRecord>,
  "recordDetails" | "veterinarian" | "vitalSigns" | "observation"
> & {
  recordDetails?: Partial<IHealthRecord["recordDetails"]>;
  veterinarian?: Partial<IHealthRecord["veterinarian"]>;
  vitalSigns?: Partial<IHealthRecord["vitalSigns"]>;
  observation?: Partial<IHealthRecord["observation"]>;
};

export const updateHealthRecord = async (
  ownerId: string,
  petId: string,
  recordId: string,
  payload: HealthRecordUpdate
): Promise<IHealthRecord> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  const record = (pet.healthRecords || []).find(
    (entry: any) => entry._id?.toString() === recordId
  );
  if (!record) {
    throw new Error("Health record not found");
  }

  if (payload.type !== undefined) record.type = payload.type;
  if (payload.recordDetails !== undefined) {
    record.recordDetails = { ...record.recordDetails, ...payload.recordDetails };
  }
  if (payload.veterinarian !== undefined) {
    record.veterinarian = { ...record.veterinarian, ...payload.veterinarian };
  }
  if (payload.vitalSigns !== undefined) {
    record.vitalSigns = { ...record.vitalSigns, ...payload.vitalSigns };
  }
  if (payload.observation !== undefined) {
    record.observation = { ...record.observation, ...payload.observation };
  }
  if (payload.attachments !== undefined) {
    record.attachments = payload.attachments;
  }

  await pet.save();
  return record;
};

export const listHealthRecords = async (
  ownerId: string,
  petId: string,
  type?: string
): Promise<IPet["healthRecords"]> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  const records = pet.healthRecords || [];
  if (!type) return records;
  return records.filter((record) => record.type === type);
};

export const deleteHealthRecord = async (
  ownerId: string,
  petId: string,
  recordId: string
): Promise<void> => {
  const pet = await ensureOwnedPet(ownerId, petId);
  const before = pet.healthRecords?.length || 0;
  pet.healthRecords = (pet.healthRecords || []).filter(
    (record: any) => record._id?.toString() !== recordId
  );
  if ((pet.healthRecords?.length || 0) === before) {
    throw new Error("Health record not found");
  }
  await pet.save();
};
