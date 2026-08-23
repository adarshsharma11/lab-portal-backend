import { Router } from "express";
import * as TestsController from "../controllers/tests.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, TestsController.list);
router.get("/:id", optionalAuth, TestsController.getById);
router.post("/", optionalAuth, TestsController.create);
router.put("/:id", optionalAuth, TestsController.update);
router.delete("/:id", optionalAuth, TestsController.remove);

export default router;
