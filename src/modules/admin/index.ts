import { Router } from "express";
import authRouter from "./auth/auth.routes";
import profileRouter from "./profile/profile.routes";
import petRouter from "./pets/pet.routes";
import usersRouter from "./users/users.routes";
import serviceRequestsRouter from "./services/serviceRequests.routes";
import settingsRouter from "./settings/settings.routes";
import adoptionRouter from "./adoption/adoption.routes";
import reportsRouter from "./reports/reports.routes";
import dashboardRouter from "./dashboard/dashboard.routes";
import analyticsRouter from "./analytics/analytics.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/profile", profileRouter);
router.use("/users", usersRouter);
router.use("/services", serviceRequestsRouter);
router.use("/settings", settingsRouter);
router.use("/adoptions", adoptionRouter);
router.use("/reports", reportsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/analytics", analyticsRouter);
router.use("/", petRouter);

const adminModule = { name: "admin", basePath: "/admin", router };

export default adminModule;
