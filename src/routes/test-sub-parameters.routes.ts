import { Router } from "express";
import { testSubParametersController } from "../controllers/test-sub-parameters.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, testSubParametersController.list);
router.get("/:mainParameter", optionalAuth, testSubParametersController.getByMainParameter);

export default router;
