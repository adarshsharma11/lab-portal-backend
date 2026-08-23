import { Router } from "express";
import * as AuthController from "../controllers/auth.controller";
import { protectAuth } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/logout", AuthController.logout);
router.get("/me", protectAuth, AuthController.me);

export default router;
