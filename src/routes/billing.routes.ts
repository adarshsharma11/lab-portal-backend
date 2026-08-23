import { Router } from "express";
import * as BillingController from "../controllers/billing.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, BillingController.list);
router.get("/:id", optionalAuth, BillingController.getById);
router.post("/", optionalAuth, BillingController.create);
router.put("/:id", optionalAuth, BillingController.update);
router.delete("/:id", optionalAuth, BillingController.remove);

export default router;
