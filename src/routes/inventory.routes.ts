import { Router } from "express";
import * as InventoryController from "../controllers/inventory.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, InventoryController.list);
router.get("/:id", optionalAuth, InventoryController.getById);
router.post("/", optionalAuth, InventoryController.create);
router.put("/:id", optionalAuth, InventoryController.update);
router.delete("/:id", optionalAuth, InventoryController.remove);

export default router;
