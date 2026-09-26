import { Router } from "express";
import * as DoctorsController from "../controllers/doctors.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", optionalAuth, DoctorsController.list);
router.get("/:id/ledger", optionalAuth, DoctorsController.getDoctorLedger);
router.get("/:id", optionalAuth, DoctorsController.getById);
router.post("/", optionalAuth, DoctorsController.create);
router.put("/:id", optionalAuth, DoctorsController.update);
router.delete("/:id", optionalAuth, DoctorsController.remove);

export default router;
