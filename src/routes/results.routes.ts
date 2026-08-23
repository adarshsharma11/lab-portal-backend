import { Router } from "express";
import * as ResultsController from "../controllers/results.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, ResultsController.list);
router.get("/:id", optionalAuth, ResultsController.getById);
router.post("/", optionalAuth, ResultsController.create);
router.put("/:id", optionalAuth, ResultsController.update);
router.delete("/:id", optionalAuth, ResultsController.remove);

export default router;
