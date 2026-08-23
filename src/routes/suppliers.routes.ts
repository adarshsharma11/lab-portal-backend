import { Router } from "express";
import * as SuppliersController from "../controllers/suppliers.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, SuppliersController.list);
router.get("/:id", optionalAuth, SuppliersController.getById);
router.post("/", optionalAuth, SuppliersController.create);
router.put("/:id", optionalAuth, SuppliersController.update);
router.delete("/:id", optionalAuth, SuppliersController.remove);

export default router;
