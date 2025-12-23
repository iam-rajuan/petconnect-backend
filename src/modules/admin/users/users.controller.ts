import { Request, Response } from "express";
import * as usersService from "./users.service";
import { toAdminUserDetails, toAdminUserSummary } from "./users.mapper";

export const listUsers = async (_req: Request, res: Response) => {
  try {
    const users = await usersService.listPetOwners();
    res.json({
      success: true,
      data: users.map(toAdminUserSummary),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch users";
    res.status(400).json({ success: false, message });
  }
};

export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const user = await usersService.getPetOwnerById(req.params.id);
    res.json({
      success: true,
      data: toAdminUserDetails(user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "User not found";
    const status = message === "User not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await usersService.deletePetOwner(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user";
    const status = message === "User not found" ? 404 : 400;
    res.status(status).json({ success: false, message });
  }
};

const csvEscape = (value: string): string => {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
};

export const exportUsersCsv = async (_req: Request, res: Response) => {
  try {
    const users = await usersService.listPetOwners();

    const header = ["NO.", "Pet Owner Name", "Username", "Email", "Status"];
    const rows = users.map((user, index) => {
      const status = user.status || (user.deletionRequestedAt ? "deletion_request" : "active");
      const name = user.name || "";
      const username = user.username || "";
      const email = user.email || "";

      return [
        String(index + 1),
        name,
        username,
        email,
        status,
      ].map(csvEscape).join(",");
    });

    const csv = [header.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=pet-owners.csv");
    res.status(200).send(csv);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export users";
    res.status(400).json({ success: false, message });
  }
};

