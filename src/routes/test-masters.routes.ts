import { Router } from "express";
import { testMastersController } from "../controllers/test-masters.controller";
import { optionalAuth, protectAuth, requireRoles } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, testMastersController.list);
router.get("/:id", optionalAuth, testMastersController.getById);
router.post("/", protectAuth, requireRoles("Admin", "Administrator"), testMastersController.create);
router.put("/:id", protectAuth, requireRoles("Admin", "Administrator"), testMastersController.update);
router.delete("/:id", protectAuth, requireRoles("Admin", "Administrator"), testMastersController.remove);

export default router;
