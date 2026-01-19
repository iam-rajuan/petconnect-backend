import { IAdoptionListing } from "../../user/adoption/adoption.model";
import { IAdoptionRequest } from "../../user/adoption/adoptionRequest.model";

export const toAdminAdoptionListItem = (listing: IAdoptionListing) => ({
  id: listing._id,
  petType: listing.species,
  petBreed: listing.breed,
  petAge: listing.age,
  status: listing.status,
  petName: listing.petName,
});

export const toAdminAdoptionSummaryItem = (listing: IAdoptionListing) => ({
  id: listing._id,
  petName: listing.petName,
  petType: listing.species,
  petBreed: listing.breed,
  petAge: listing.age,
  status: listing.status,
});

export const toAdminAdoptionRequestListItem = (request: IAdoptionRequest) => ({
  id: request._id,
  customerName:
    typeof request.customer === "object" && request.customer
      ? (request.customer as { name?: string }).name
      : "",
  petType:
    typeof request.listing === "object" && request.listing
      ? (request.listing as { species?: string }).species
      : "",
  petBreed:
    typeof request.listing === "object" && request.listing
      ? (request.listing as { breed?: string }).breed
      : "",
  petAge:
    typeof request.listing === "object" && request.listing
      ? (request.listing as { age?: number }).age
      : null,
  status: request.status,
});
