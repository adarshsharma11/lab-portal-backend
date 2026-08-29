import { Router } from "express";
import * as ProfileController from "../controllers/profile.controller";
import { protectAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", protectAuth, ProfileController.getProfile);
router.put("/", protectAuth, ProfileController.updateProfile);

export default router;
