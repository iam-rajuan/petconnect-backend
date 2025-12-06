import AdoptionListing, { IAdoptionListing, AdoptionStatus } from "./adoption.model";
import { CreateAdoptionListingInput, ListingQueryInput } from "./adoption.validation";
import { ensureOwnedPet } from "../pets/pets.service";
import User from "../auth/models/user.model";

export interface PaginatedAdoptionListings {
  data: IAdoptionListing[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const sanitizePagination = (page?: number, limit?: number) => {
  const safePage = !page || Number.isNaN(page) || page < 1 ? 1 : Math.floor(page);
  const safeLimit =
    !limit || Number.isNaN(limit) || limit < 1 || limit > 100 ? 10 : Math.floor(limit);
  return { page: safePage, limit: safeLimit };
};

export const createAdoptionListing = async (
  ownerId: string,
  payload: CreateAdoptionListingInput
): Promise<IAdoptionListing> => {
  // Ensure the user actually owns this pet
  const pet = await ensureOwnedPet(ownerId, payload.petId);

  // Prevent multiple active listings for the same pet
  const existing = await AdoptionListing.findOne({
    pet: pet._id,
    status: { $in: ["available", "pending"] },
  });

  if (existing) {
    throw new Error("An active adoption listing already exists for this pet");
  }

  // Load owner to derive default contact info if needed
  const owner = await User.findById(ownerId);
  if (!owner) {
    throw new Error("Owner not found");
  }

  const contactName = payload.contactName?.trim() || owner.name;
  const contactEmail = payload.contactEmail ?? owner.email ?? null;
  const contactPhone = payload.contactPhone ?? owner.phone ?? null;

  const listing = await AdoptionListing.create({
    pet: pet._id,
    owner: owner._id,
    title: payload.title.trim(),
    description: payload.description?.trim(),
    location: payload.location.trim(),
    status: "available",

    // Denormalized pet info
    petName: pet.name,
    species: pet.species,
    breed: pet.breed,
    age: pet.age,
    gender: pet.gender,
    avatarUrl: pet.avatarUrl,

    // Rescue contact info
    contactName,
    contactEmail,
    contactPhone,
  });

  return listing;
};

export const listAdoptionListings = async (
  filters: ListingQueryInput
): Promise<PaginatedAdoptionListings> => {
  const { page, limit } = sanitizePagination(filters.page, filters.limit);

  const query: Record<string, any> = {};

  // Status: default to "available" if none specified
  if (filters.status) {
    query.status = filters.status;
  } else {
    query.status = "available";
  }

  if (filters.species) {
    query.species = new RegExp(`^${filters.species}$`, "i");
  }

  if (filters.breed) {
    query.breed = new RegExp(filters.breed, "i");
  }

  if (filters.location) {
    query.location = new RegExp(filters.location, "i");
  }

  if (typeof filters.ageMin !== "undefined" || typeof filters.ageMax !== "undefined") {
    query.age = {};
    if (typeof filters.ageMin !== "undefined") {
      query.age.$gte = filters.ageMin;
    }
    if (typeof filters.ageMax !== "undefined") {
      query.age.$lte = filters.ageMax;
    }
  }

  const total = await AdoptionListing.countDocuments(query);
  const listings = await AdoptionListing.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

  return {
    data: listings,
    page,
    limit,
    total,
    totalPages,
  };
};

export const getAdoptionListingById = async (id: string): Promise<IAdoptionListing> => {
  const listing = await AdoptionListing.findById(id).populate("pet");
  if (!listing) {
    throw new Error("Adoption listing not found");
  }
  return listing;
};

export const updateAdoptionStatus = async (
  id: string,
  status: AdoptionStatus
): Promise<IAdoptionListing> => {
  const listing = await AdoptionListing.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );
  if (!listing) {
    throw new Error("Adoption listing not found");
  }
  return listing;
};

export const deleteAdoptionListing = async (
  listingId: string,
  requestUserId: string,
  isAdmin: boolean
): Promise<void> => {
  const filter: Record<string, any> = { _id: listingId };
  // Non-admins can only delete their own listings
  if (!isAdmin) {
    filter.owner = requestUserId;
  }

  const result = await AdoptionListing.findOneAndDelete(filter);
  if (!result) {
    throw new Error("Adoption listing not found or not authorized to delete");
  }
};

export const listUserAdoptionListings = async (
  ownerId: string
): Promise<IAdoptionListing[]> => {
  const listings = await AdoptionListing.find({ owner: ownerId }).sort({
    createdAt: -1,
  });
  return listings;
};
