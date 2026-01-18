import { Request, Response } from "express";
import * as petTypesService from "./petTypes.service";

export const createPetType = async (req: Request, res: Response) => {
  try {
    const petType = await petTypesService.createPetType(req.body.name);
    res.status(201).json({ success: true, data: petType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create pet type";
    res.status(400).json({ success: false, message });
  }
};

export const listPetTypes = async (_req: Request, res: Response) => {
  try {
    const petTypes = await petTypesService.listPetTypes();
    res.json({ success: true, data: petTypes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch pet types";
    res.status(400).json({ success: false, message });
  }
};

export const updatePetType = async (req: Request, res: Response) => {
  try {
    const petType = await petTypesService.updatePetType(req.params.id, req.body.name);
    res.json({ success: true, message: "Pet type updated", data: petType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update pet type";
    const status = message === "Pet type not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deletePetType = async (req: Request, res: Response) => {
  try {
    await petTypesService.deletePetType(req.params.id);
    res.json({ success: true, message: "Pet type deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete pet type";
    const status = message === "Pet type not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const updatePetBreeds = async (req: Request, res: Response) => {
  try {
    const petType = await petTypesService.updatePetBreeds(req.params.id, req.body.breeds);
    res.json({
      success: true,
      message: "Pet breeds updated",
      data: petType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update pet breeds";
    const status = message === "Pet type not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};
