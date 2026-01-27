import { IAdoptionListing } from "../../user/adoption/adoption.model";
import { IAdoptionRequest } from "../../user/adoption/adoptionRequest.model";
import mongoose from "mongoose";

const toIdString = (value?: mongoose.Types.ObjectId | string): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.toString();
};

const extractId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object" && "_id" in value) {
    const nested = (value as { _id?: unknown })._id;
    return extractId(nested);
  }
  return "";
};

const isPopulated = <T extends object>(value: unknown): value is T =>
  !!value && typeof value === "object" && !(value instanceof mongoose.Types.ObjectId);

export const toAdminAdoptionListItem = (listing: IAdoptionListing) => ({
  id: listing._id,
  petType: listing.species,
  petBreed: listing.breed,
  petAge: listing.age,
  price: listing.price ?? 0,
  status: listing.status,
  petName: listing.petName,
});

export const toAdminAdoptionSummaryItem = (listing: IAdoptionListing) => ({
  id: listing._id,
  petName: listing.petName,
  petType: listing.species,
  petBreed: listing.breed,
  petAge: listing.age,
  price: listing.price ?? 0,
  status: listing.status,
});

export const toAdminAdoptionRequestListItem = (request: IAdoptionRequest) => ({
  id: request._id,
  listingId: extractId(request.listing),
  customerId: extractId(request.customer),
  customerName:
    isPopulated<{ name?: string }>(request.customer) ? request.customer.name
      : "",
  petType:
    isPopulated<{ species?: string }>(request.listing) ? request.listing.species
      : "",
  petBreed:
    isPopulated<{ breed?: string }>(request.listing) ? request.listing.breed
      : "",
  petAge:
    isPopulated<{ age?: number }>(request.listing) ? request.listing.age
      : null,
  status: request.status,
});

export const toAdminAdoptionRequestDetails = (request: IAdoptionRequest) => {
  type CustomerInfo = {
    _id?: mongoose.Types.ObjectId | string;
    name?: string;
    phone?: string;
    address?: string;
  };
  type ListingInfo = {
    _id?: mongoose.Types.ObjectId | string;
    petName?: string;
    species?: string;
    breed?: string;
    age?: number;
    gender?: string;
    avatarUrl?: string;
    photos?: string[];
    status?: string;
  };

  const customer = isPopulated<CustomerInfo>(request.customer)
    ? (request.customer as CustomerInfo)
    : undefined;
  const listing = isPopulated<ListingInfo>(request.listing)
    ? (request.listing as ListingInfo)
    : undefined;

  return {
    id: request._id,
    status: request.status,
    orderId: request._id,
    orderDate: request.createdAt,
    customer: {
      id: toIdString(customer?._id),
      name: customer?.name || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
    },
    listing: {
      id: toIdString(listing?._id),
      petName: listing?.petName || "",
      petType: listing?.species || "",
      petBreed: listing?.breed || "",
      petAge: listing?.age ?? null,
      petGender: listing?.gender || "",
      avatarUrl: listing?.avatarUrl || "",
      photos: listing?.photos || [],
      status: listing?.status || "",
    },
  };
};
