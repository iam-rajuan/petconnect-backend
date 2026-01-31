import ServiceBooking, { IServiceBooking } from "../../services/serviceBooking.model";
import { ServiceRequestQuery, UpdateServiceStatusInput } from "./serviceRequests.validation";

export const listServiceRequests = async (
  query: ServiceRequestQuery
): Promise<{ data: IServiceBooking[]; pagination: { total: number; page: number; limit: number } }> => {
  const { status, page, limit } = query;
  const filter: Record<string, unknown> = {};

  if (status && status !== "all") {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [total, data] = await Promise.all([
    ServiceBooking.countDocuments(filter),
    ServiceBooking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "customer", select: "name" })
      .populate({ path: "pets", select: "name species breed age" }),
  ]);

  return {
    data,
    pagination: { total, page, limit },
  };
};

export const getServiceRequestById = async (id: string): Promise<IServiceBooking> => {
  const request = await ServiceBooking.findById(id)
    .populate({ path: "customer", select: "name phone" })
    .populate({ path: "provider", select: "name" })
    .populate({ path: "pets", select: "name species breed age" });

  if (!request) {
    throw new Error("Service request not found");
  }

  return request;
};

export const updateServiceStatus = async (
  id: string,
  payload: UpdateServiceStatusInput
): Promise<IServiceBooking> => {
  const request = await ServiceBooking.findById(id);
  if (!request) {
    throw new Error("Service request not found");
  }

  request.status = payload.status;
  if (payload.status === "completed") {
    if (request.paymentStatus !== "paid") {
      request.paymentStatus = "paid";
    }
    if (!request.paidAt) {
      request.paidAt = new Date();
    }
    console.log(
      `[service-complete] booking=${request._id.toString()} paymentStatus=${request.paymentStatus} paidAt=${request.paidAt?.toISOString?.() || "n/a"}`
    );
  }
  await request.save();

  return request;
};

export const deleteServiceRequest = async (id: string): Promise<void> => {
  const request = await ServiceBooking.findById(id);
  if (!request) {
    throw new Error("Service request not found");
  }
  await request.deleteOne();
};
