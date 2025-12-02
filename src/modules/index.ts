import { Router } from "express";
import authModule from "./auth";
import adminModule from "./admin";
import petsModule from "./pets";
import uploadsModule from "./uploads";

export interface ModuleDefinition {
  name: string;
  basePath: string;
  router: Router;
}

const modules: ModuleDefinition[] = [authModule, adminModule, petsModule, uploadsModule];

export default modules;
