import AdoptionListing, { IAdoptionListing, AdoptionStatus } from "./adoption.model";
import { CreateAdoptionListingInput, ListingQueryInput } from "./adoption.validation";
import { ensureOwnedPet } from "../pets/pets.service";
import User from "../users/user.model";
import AdoptionRequest, { IAdoptionRequest } from "./adoptionRequest.model";
import AdoptionBasket, { IAdoptionBasket } from "./adoptionBasket.model";
import AdoptionOrder, { IAdoptionOrder } from "./adoptionOrder.model";
import TaxSetting from "../../services/taxSetting.model";
import { calculateTotals } from "../../services/pricing.service";
import { env } from "../../../env";
import { createPaymentIntent } from "../bookings/stripe.service";

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

export const createAdoptionRequest = async (
  listingId: string,
  userId: string
): Promise<IAdoptionRequest> => {
  const listing = await AdoptionListing.findById(listingId);
  if (!listing) {
    throw new Error("Adoption listing not found");
  }
  if (listing.status === "adopted") {
    throw new Error("Adoption listing is already adopted");
  }

  const request = await AdoptionRequest.create({
    listing: listingId,
    customer: userId,
    status: "pending",
  });

  listing.status = "pending";
  await listing.save();

  return request;
};

export const getAdoptionListingByIdOrFail = async (id: string): Promise<IAdoptionListing> => {
  const listing = await AdoptionListing.findById(id);
  if (!listing) {
    throw new Error("Adoption listing not found");
  }
  return listing;
};

export const listHealthRecords = async (
  listingId: string,
  type?: string
): Promise<NonNullable<IAdoptionListing["healthRecords"]>> => {
  const listing = await AdoptionListing.findById(listingId).select("healthRecords");
  if (!listing) {
    throw new Error("Adoption listing not found");
  }
  const records = listing.healthRecords || [];
  if (!type) return records;
  return records.filter((record) => record.type === type);
};

export const getHealthRecord = async (
  listingId: string,
  recordId: string
): Promise<NonNullable<IAdoptionListing["healthRecords"]>[number]> => {
  const listing = await AdoptionListing.findById(listingId).select("healthRecords");
  if (!listing) {
    throw new Error("Adoption listing not found");
  }
  const record = (listing.healthRecords || []).find(
    (item: any) => item._id?.toString() === recordId
  );
  if (!record) {
    throw new Error("Health record not found");
  }
  return record;
};

const getTaxPercent = async (): Promise<number> => {
  const tax = await TaxSetting.findOne({ isActive: true }).sort({ createdAt: -1 });
  return tax?.percent ?? 0;
};

const resolveAdoptionListings = async (listingIds: string[]) => {
  const listings = await AdoptionListing.find({ _id: { $in: listingIds } });
  if (listings.length === 0) {
    throw new Error("No adoption listings found");
  }
  const missing = listingIds.filter(
    (id) => !listings.find((listing) => listing._id.toString() === id)
  );
  if (missing.length > 0) {
    throw new Error("Some adoption listings were not found");
  }
  const unavailable = listings.find((listing) => listing.status === "adopted");
  if (unavailable) {
    throw new Error("One or more listings are already adopted");
  }
  return listings;
};

export const getOrCreateBasket = async (userId: string): Promise<IAdoptionBasket> => {
  const basket = await AdoptionBasket.findOne({ user: userId }).populate(
    "items.listing"
  );
  if (basket) return basket;
  return AdoptionBasket.create({ user: userId, items: [] });
};

export const addToBasket = async (
  userId: string,
  listingId: string
): Promise<IAdoptionBasket> => {
  const listing = await getAdoptionListingByIdOrFail(listingId);
  if (listing.status === "adopted") {
    throw new Error("Adoption listing is already adopted");
  }

  const basket = await getOrCreateBasket(userId);
  const exists = basket.items.some((item) => item.listing.toString() === listingId);
  if (!exists) {
    basket.items.push({ listing: listing._id, addedAt: new Date() });
    await basket.save();
  }

  return AdoptionBasket.findOne({ user: userId }).populate("items.listing") as Promise<IAdoptionBasket>;
};

export const removeFromBasket = async (
  userId: string,
  listingId: string
): Promise<IAdoptionBasket> => {
  const basket = await getOrCreateBasket(userId);
  basket.items = basket.items.filter((item) => item.listing.toString() !== listingId);
  await basket.save();
  return AdoptionBasket.findOne({ user: userId }).populate("items.listing") as Promise<IAdoptionBasket>;
};

export const clearBasket = async (userId: string): Promise<void> => {
  await AdoptionBasket.findOneAndUpdate({ user: userId }, { items: [] });
};

export const createAdoptionOrder = async (payload: {
  userId: string;
  listingIds: string[];
  customer: { name: string; address: string; phone: string };
}): Promise<{ order: IAdoptionOrder; clientSecret: string }> => {
  const listings = await resolveAdoptionListings(payload.listingIds);

  const items = listings.map((listing) => ({
    listing: listing._id,
    petName: listing.petName,
    petType: listing.species,
    petBreed: listing.breed || "",
    petAge: listing.age ?? null,
    petGender: listing.gender || "",
    avatarUrl: listing.avatarUrl || null,
    price: listing.price ?? 0,
  }));

  const subtotal = Number(
    items.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)
  );
  const taxPercent = await getTaxPercent();
  const { taxAmount, total: taxTotal } = calculateTotals(subtotal, taxPercent);

  const processingFee = 40;
  const shippingFee = 40;
  const total = Number((taxTotal + processingFee + shippingFee).toFixed(2));
  const currency = env.STRIPE_CURRENCY || "usd";

  const order = await AdoptionOrder.create({
    customer: payload.userId,
    items,
    customerInfo: payload.customer,
    status: "pending",
    paymentStatus: "unpaid",
    subtotal,
    taxPercent,
    taxAmount,
    processingFee,
    shippingFee,
    total,
    currency,
  });

  for (const listing of listings) {
    const existingRequest = await AdoptionRequest.findOne({
      listing: listing._id,
      customer: payload.userId,
    });
    if (!existingRequest) {
      await AdoptionRequest.create({
        listing: listing._id,
        customer: payload.userId,
        status: "pending",
      });
    }
    if (listing.status !== "pending") {
      listing.status = "pending";
      await listing.save();
    }
  }

  try {
    const paymentIntent = await createPaymentIntent({
      amount: Math.round(total * 100),
      currency,
      metadata: { adoptionOrderId: order._id.toString(), userId: payload.userId },
      idempotencyKey: order._id.toString(),
    });

    order.paymentIntentId = paymentIntent.id;
    await order.save();

    await clearBasket(payload.userId);

    return { order, clientSecret: paymentIntent.clientSecret };
  } catch (err) {
    await order.deleteOne();
    const message = err instanceof Error ? err.message : "Failed to create payment";
    throw new Error(message);
  }
};

export const getUserOrders = async (userId: string): Promise<IAdoptionOrder[]> => {
  return AdoptionOrder.find({ customer: userId }).sort({ createdAt: -1 });
};
