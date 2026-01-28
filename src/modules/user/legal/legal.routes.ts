import { Router } from "express";
import * as legalController from "./legal.controller";

const router = Router();

router.get("/terms", legalController.getTerms);
router.get("/privacy", legalController.getPrivacy);

export default router;
