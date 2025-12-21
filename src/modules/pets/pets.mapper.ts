import { IPet } from "./pets.model";

export const toPetResponse = (pet: IPet) => ({
  id: pet._id,
  owner: pet.owner,
  name: pet.name,
  type: pet.species,
  species: pet.species,
  breed: pet.breed,
  age: pet.age,
  weightLbs: pet.weightLbs,
  gender: pet.gender,
  trained: pet.trained,
  neutered: pet.neutered,
  personality: pet.personality || [],
  about: pet.bio,
  bio: pet.bio,
  avatarUrl: pet.avatarUrl,
  photos: pet.photos,
  medicalRecords: pet.medicalRecords,
  createdAt: pet.createdAt,
  updatedAt: pet.updatedAt,
});
