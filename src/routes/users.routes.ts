import { Router } from "express";
import * as UsersController from "../controllers/users.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, UsersController.list);
router.get("/:id", optionalAuth, UsersController.getById);
router.post("/", optionalAuth, UsersController.create);
router.put("/:id", optionalAuth, UsersController.update);
router.delete("/:id", optionalAuth, UsersController.remove);

export default router;
