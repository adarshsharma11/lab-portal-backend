import { Router } from "express";
import * as AppointmentsController from "../controllers/appointments.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, AppointmentsController.list);
router.get("/:id", optionalAuth, AppointmentsController.getById);
router.post("/", optionalAuth, AppointmentsController.create);
router.put("/:id", optionalAuth, AppointmentsController.update);
router.delete("/:id", optionalAuth, AppointmentsController.remove);

export default router;
