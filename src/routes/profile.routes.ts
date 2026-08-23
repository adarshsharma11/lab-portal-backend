import { Router } from "express";
import * as ProfileController from "../controllers/profile.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, ProfileController.getProfile);
router.put("/", optionalAuth, ProfileController.updateProfile);

export default router;
