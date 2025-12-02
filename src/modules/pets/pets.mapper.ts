import { IPet } from "./pets.model";

export const toPetResponse = (pet: IPet) => ({
  id: pet._id,
  owner: pet.owner,
  name: pet.name,
  species: pet.species,
  breed: pet.breed,
  age: pet.age,
  gender: pet.gender,
  bio: pet.bio,
  avatarUrl: pet.avatarUrl,
  photos: pet.photos,
  medicalRecords: pet.medicalRecords,
  createdAt: pet.createdAt,
  updatedAt: pet.updatedAt,
});
