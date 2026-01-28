import ServiceCatalog, { IServiceCatalog } from "../../services/serviceCatalog.model";
import TaxSetting, { ITaxSetting } from "../../services/taxSetting.model";
import AvailabilitySetting, {
  IAvailabilitySetting,
} from "../../services/availabilitySetting.model";
import TermsAndConditions, {
  ITermsAndConditions,
} from "../../services/termsAndConditions.model";
import {
  AvailabilityInput,
  CreateServiceInput,
  PrivacyInput,
  TermsInput,
  UpdateServiceInput,
  TaxInput,
  UpdateServicesInput,
} from "./settings.validation";

const DEFAULT_SERVICES: Array<Pick<IServiceCatalog, "name" | "type" | "price" | "isActive">> =
  [
    { name: "VET", type: "vet", price: 250, isActive: true },
    { name: "WALKING", type: "walking", price: 250, isActive: true },
    { name: "GROOMING", type: "grooming", price: 250, isActive: true },
    { name: "TRAINING", type: "training", price: 250, isActive: true },
  ];

export const listServices = async (): Promise<IServiceCatalog[]> => {
  const existing = await ServiceCatalog.find().sort({ createdAt: -1 });
  if (existing.length > 0) {
    return existing;
  }

  const created = await ServiceCatalog.insertMany(
    DEFAULT_SERVICES.map((service) => ({
      name: service.name,
      type: service.type,
      price: service.price,
      isActive: service.isActive,
    }))
  );
  return created;
};

export const createService = async (payload: CreateServiceInput): Promise<IServiceCatalog> => {
  const existing = await ServiceCatalog.findOne({ type: payload.type });
  if (existing) {
    throw new Error("Service type already exists");
  }

  return ServiceCatalog.create({
    name: payload.name.trim(),
    type: payload.type,
    price: payload.price,
    isActive: payload.isActive ?? true,
  });
};

export const updateService = async (
  id: string,
  payload: UpdateServiceInput
): Promise<IServiceCatalog> => {
  const service = await ServiceCatalog.findById(id);
  if (!service) {
    throw new Error("Service not found");
  }

  if (payload.name !== undefined) {
    service.name = payload.name.trim();
  }
  if (payload.price !== undefined) {
    service.price = payload.price;
  }
  if (payload.isActive !== undefined) {
    service.isActive = payload.isActive;
  }

  await service.save();
  return service;
};

export const updateServices = async (
  payload: UpdateServicesInput
): Promise<IServiceCatalog[]> => {
  const types = payload.services.map((service) => service.type);

  const updates = payload.services.map((service) =>
    ServiceCatalog.findOneAndUpdate(
      { type: service.type },
      {
        name: service.name.trim(),
        type: service.type,
        price: service.price,
        isActive: service.isActive ?? true,
      },
      { upsert: true, new: true }
    )
  );

  await Promise.all(updates);
  await ServiceCatalog.deleteMany({ type: { $nin: types } });
  return ServiceCatalog.find().sort({ createdAt: -1 });
};

export const deleteService = async (id: string): Promise<void> => {
  const service = await ServiceCatalog.findById(id);
  if (!service) {
    throw new Error("Service not found");
  }
  await service.deleteOne();
};

export const setActiveTax = async (payload: TaxInput): Promise<ITaxSetting> => {
  await TaxSetting.updateMany({ isActive: true }, { isActive: false });
  return TaxSetting.create({ percent: payload.percent, isActive: true });
};

export const getActiveTax = async (): Promise<ITaxSetting | null> => {
  return TaxSetting.findOne({ isActive: true }).sort({ createdAt: -1 });
};

export const updateActiveTax = async (payload: TaxInput): Promise<ITaxSetting> => {
  const active = await TaxSetting.findOne({ isActive: true }).sort({ createdAt: -1 });
  if (!active) {
    return setActiveTax(payload);
  }
  active.percent = payload.percent;
  await active.save();
  return active;
};

const DEFAULT_AVAILABILITY = { startTime: "09:00", endTime: "17:00", slotMinutes: 30 };

export const getAvailabilitySetting = async (): Promise<IAvailabilitySetting> => {
  const setting = await AvailabilitySetting.findOne().sort({ createdAt: -1 });
  if (setting) {
    return setting;
  }
  return AvailabilitySetting.create(DEFAULT_AVAILABILITY);
};

export const updateAvailabilitySetting = async (
  payload: AvailabilityInput
): Promise<IAvailabilitySetting> => {
  const setting = await AvailabilitySetting.findOne().sort({ createdAt: -1 });
  if (!setting) {
    return AvailabilitySetting.create(payload);
  }
  setting.startTime = payload.startTime;
  setting.endTime = payload.endTime;
  setting.slotMinutes = payload.slotMinutes;
  await setting.save();
  return setting;
};

export const getTerms = async (): Promise<ITermsAndConditions | null> => {
  return TermsAndConditions.findOne({ type: "terms" }).sort({ updatedAt: -1 });
};

export const updateTerms = async (payload: TermsInput): Promise<ITermsAndConditions> => {
  const content = payload.content.trim();
  const updated = await TermsAndConditions.findOneAndUpdate(
    { type: "terms" },
    { content },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return updated;
};

export const getPrivacy = async (): Promise<ITermsAndConditions | null> => {
  return TermsAndConditions.findOne({ type: "privacy" }).sort({ updatedAt: -1 });
};

export const updatePrivacy = async (payload: PrivacyInput): Promise<ITermsAndConditions> => {
  const content = payload.content.trim();
  const updated = await TermsAndConditions.findOneAndUpdate(
    { type: "privacy" },
    { content },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return updated;
};
