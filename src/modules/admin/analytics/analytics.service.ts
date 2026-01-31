import AdoptionOrder from "../../user/adoption/adoptionOrder.model";
import ServiceBooking from "../../services/serviceBooking.model";
import User from "../../user/users/user.model";
import { env } from "../../../env";

const roundMoney = (value: number) => Number(value.toFixed(2));

const buildMonthRange = (year: number, month: number) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
};

const buildYearRange = (year: number) => {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return { start, end };
};

const toMonthlyBuckets = (entries: Array<{ _id: number; value: number }>) => {
  const buckets = Array.from({ length: 12 }, () => 0);
  for (const entry of entries) {
    if (entry._id >= 1 && entry._id <= 12) {
      buckets[entry._id - 1] = roundMoney(entry.value || 0);
    }
  }
  return buckets;
};

const toMonthlyCountBuckets = (entries: Array<{ _id: number; count: number }>) => {
  const buckets = Array.from({ length: 12 }, () => 0);
  for (const entry of entries) {
    if (entry._id >= 1 && entry._id <= 12) {
      buckets[entry._id - 1] = entry.count || 0;
    }
  }
  return buckets;
};

export const getMonthlyBreakdown = async (month: number, year: number) => {
  const { start, end } = buildMonthRange(year, month);

  const [adoptionAgg, serviceAgg] = await Promise.all([
    AdoptionOrder.aggregate([
      {
        $match: { paymentStatus: "paid" },
      },
      {
        $addFields: {
          paidDate: { $ifNull: ["$paidAt", "$updatedAt", "$createdAt"] },
        },
      },
      {
        $match: { paidDate: { $gte: start, $lt: end } },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
    ]),
    ServiceBooking.aggregate([
      {
        $match: { paymentStatus: "paid" },
      },
      {
        $addFields: {
          paidDate: { $ifNull: ["$paidAt", "$updatedAt", "$createdAt"] },
        },
      },
      {
        $match: { paidDate: { $gte: start, $lt: end } },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const adoptionRevenue = roundMoney(adoptionAgg?.[0]?.revenue ?? 0);
  const serviceRevenue = roundMoney(serviceAgg?.[0]?.revenue ?? 0);
  const totalRevenue = roundMoney(adoptionRevenue + serviceRevenue);

  return {
    month,
    year,
    currency: env.STRIPE_CURRENCY || "usd",
    adoption: {
      revenue: adoptionRevenue,
      orders: adoptionAgg?.[0]?.count ?? 0,
    },
    service: {
      revenue: serviceRevenue,
      bookings: serviceAgg?.[0]?.count ?? 0,
    },
    total: totalRevenue,
  };
};

export const getRevenueMetricsByYear = async (year: number) => {
  const { start, end } = buildYearRange(year);

  const [adoptionAgg, serviceAgg] = await Promise.all([
    AdoptionOrder.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $addFields: { paidDate: { $ifNull: ["$paidAt", "$updatedAt", "$createdAt"] } } },
      { $match: { paidDate: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { $month: "$paidDate" },
          value: { $sum: "$total" },
        },
      },
    ]),
    ServiceBooking.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $addFields: { paidDate: { $ifNull: ["$paidAt", "$updatedAt", "$createdAt"] } } },
      { $match: { paidDate: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { $month: "$paidDate" },
          value: { $sum: "$total" },
        },
      },
    ]),
  ]);

  const adoptionRevenue = toMonthlyBuckets(
    adoptionAgg.map((row) => ({ _id: row._id, value: row.value }))
  );
  const serviceRevenue = toMonthlyBuckets(
    serviceAgg.map((row) => ({ _id: row._id, value: row.value }))
  );
  const totalRevenue = adoptionRevenue.map((value, index) =>
    roundMoney(value + serviceRevenue[index])
  );

  return {
    year,
    currency: env.STRIPE_CURRENCY || "usd",
    total: totalRevenue,
  };
};

export const getUserMetricsByYear = async (year: number) => {
  const { start, end } = buildYearRange(year);
  const userAgg = await User.aggregate([
    { $match: { role: { $ne: "admin" } } },
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    year,
    users: toMonthlyCountBuckets(
      userAgg.map((row) => ({ _id: row._id, count: row.count }))
    ),
  };
};
