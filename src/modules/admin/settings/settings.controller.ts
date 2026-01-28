import { Request, Response } from "express";
import * as settingsService from "./settings.service";
import {
  AvailabilityInput,
  CreateServiceInput,
  PrivacyInput,
  TermsInput,
  TaxInput,
  UpdateServiceInput,
  UpdateServicesInput,
} from "./settings.validation";

export const listServices = async (_req: Request, res: Response) => {
  try {
    const services = await settingsService.listServices();
    res.json({ success: true, data: services });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch services";
    res.status(400).json({ success: false, message });
  }
};

export const createService = async (req: Request & { body: CreateServiceInput }, res: Response) => {
  try {
    const service = await settingsService.createService(req.body);
    res.status(201).json({ success: true, data: service, message: "Service created" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create service";
    res.status(400).json({ success: false, message });
  }
};

export const updateService = async (req: Request & { body: UpdateServiceInput }, res: Response) => {
  try {
    const service = await settingsService.updateService(req.params.id, req.body);
    res.json({ success: true, data: service, message: "Service updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update service";
    const status = message === "Service not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    await settingsService.deleteService(req.params.id);
    res.json({ success: true, message: "Service deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete service";
    const status = message === "Service not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const getActiveTax = async (_req: Request, res: Response) => {
  try {
    const tax = await settingsService.getActiveTax();
    res.json({ success: true, data: tax ? { percent: tax.percent } : { percent: 0 } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch tax";
    res.status(400).json({ success: false, message });
  }
};

export const setActiveTax = async (req: Request & { body: TaxInput }, res: Response) => {
  try {
    const tax = await settingsService.setActiveTax(req.body);
    res.status(201).json({ success: true, data: { percent: tax.percent }, message: "Tax updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update tax";
    res.status(400).json({ success: false, message });
  }
};

export const updateServices = async (
  req: Request & { body: UpdateServicesInput },
  res: Response
) => {
  try {
    const services = await settingsService.updateServices(req.body);
    res.json({ success: true, data: services, message: "Services updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update services";
    res.status(400).json({ success: false, message });
  }
};

export const updateActiveTax = async (req: Request & { body: TaxInput }, res: Response) => {
  try {
    const tax = await settingsService.updateActiveTax(req.body);
    res.json({ success: true, data: { percent: tax.percent }, message: "Tax updated" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update tax";
    res.status(400).json({ success: false, message });
  }
};

export const getAvailability = async (_req: Request, res: Response) => {
  try {
    const setting = await settingsService.getAvailabilitySetting();
    res.json({
      success: true,
      data: {
        startTime: setting.startTime,
        endTime: setting.endTime,
        slotMinutes: setting.slotMinutes,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch availability";
    res.status(400).json({ success: false, message });
  }
};

export const updateAvailability = async (
  req: Request & { body: AvailabilityInput },
  res: Response
) => {
  try {
    const setting = await settingsService.updateAvailabilitySetting(req.body);
    res.json({
      success: true,
      message: "Availability updated",
      data: {
        startTime: setting.startTime,
        endTime: setting.endTime,
        slotMinutes: setting.slotMinutes,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update availability";
    res.status(400).json({ success: false, message });
  }
};

export const getTerms = async (_req: Request, res: Response) => {
  try {
    const terms = await settingsService.getTerms();
    res.json({
      success: true,
      data: {
        content: terms?.content ?? "",
        updatedAt: terms?.updatedAt ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch terms";
    res.status(400).json({ success: false, message });
  }
};

export const updateTerms = async (req: Request & { body: TermsInput }, res: Response) => {
  try {
    const terms = await settingsService.updateTerms(req.body);
    res.json({
      success: true,
      message: "Terms updated",
      data: { content: terms.content, updatedAt: terms.updatedAt },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update terms";
    res.status(400).json({ success: false, message });
  }
};

export const getPrivacy = async (_req: Request, res: Response) => {
  try {
    const policy = await settingsService.getPrivacy();
    res.json({
      success: true,
      data: {
        content: policy?.content ?? "",
        updatedAt: policy?.updatedAt ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch privacy policy";
    res.status(400).json({ success: false, message });
  }
};

export const updatePrivacy = async (req: Request & { body: PrivacyInput }, res: Response) => {
  try {
    const policy = await settingsService.updatePrivacy(req.body);
    res.json({
      success: true,
      message: "Privacy policy updated",
      data: { content: policy.content, updatedAt: policy.updatedAt },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update privacy policy";
    res.status(400).json({ success: false, message });
  }
};
