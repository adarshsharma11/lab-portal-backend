import { Router } from "express";
import * as InstrumentsController from "../controllers/instruments.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, InstrumentsController.list);
router.get("/:id", optionalAuth, InstrumentsController.getById);
router.post("/", optionalAuth, InstrumentsController.create);
router.put("/:id", optionalAuth, InstrumentsController.update);
router.delete("/:id", optionalAuth, InstrumentsController.remove);

export default router;
