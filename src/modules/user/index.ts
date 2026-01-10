import { Router } from "express";
import authModule from "./auth";
import usersModule from "./users";
import petsModule from "./pets";
import uploadsModule from "./uploads";
import adoptionModule from "./adoption";
import providersModule from "./providers";
import appointmentsModule from "./appointments";
import servicesModule from "./services";
import bookingsModule from "./bookings";
import paymentsModule from "./payments";
import messagesModule from "./messages";

export interface UserModuleDefinition {
  name: string;
  basePath: string;
  router: Router;
}

const userModules: UserModuleDefinition[] = [
  authModule,
  usersModule,
  petsModule,
  uploadsModule,
  adoptionModule,
  providersModule,
  appointmentsModule,
  servicesModule,
  bookingsModule,
  paymentsModule,
  messagesModule,
];

export default userModules;
