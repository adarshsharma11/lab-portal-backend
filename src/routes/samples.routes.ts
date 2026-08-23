import { Router } from "express";
import * as SamplesController from "../controllers/samples.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, SamplesController.list);
router.get("/:id", optionalAuth, SamplesController.getById);
router.post("/", optionalAuth, SamplesController.create);
router.put("/:id", optionalAuth, SamplesController.update);
router.delete("/:id", optionalAuth, SamplesController.remove);

export default router;
