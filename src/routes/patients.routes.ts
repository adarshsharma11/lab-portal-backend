import { Router } from "express";
import * as PatientsController from "../controllers/patients.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, PatientsController.list);
router.get("/:id", optionalAuth, PatientsController.getById);
router.post("/", optionalAuth, PatientsController.create);
router.put("/:id", optionalAuth, PatientsController.update);
router.delete("/:id", optionalAuth, PatientsController.remove);

export default router;
