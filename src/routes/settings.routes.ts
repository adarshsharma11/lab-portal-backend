import { Router } from "express";
import * as SettingsController from "../controllers/settings.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

// Laboratory Info
router.get("/laboratory", optionalAuth, SettingsController.getLaboratory);
router.put("/laboratory", optionalAuth, SettingsController.updateLaboratory);

// Report Settings
router.get("/report", optionalAuth, SettingsController.getReportSettings);
router.put("/report", optionalAuth, SettingsController.updateReportSettings);

// Reference Ranges
router.get("/reference-ranges", optionalAuth, SettingsController.listReferenceRanges);
router.post("/reference-ranges", optionalAuth, SettingsController.createReferenceRange);
router.put("/reference-ranges/:id", optionalAuth, SettingsController.updateReferenceRange);
router.delete("/reference-ranges/:id", optionalAuth, SettingsController.deleteReferenceRange);

// Units
router.get("/units", optionalAuth, SettingsController.listUnits);
router.post("/units", optionalAuth, SettingsController.createUnit);
router.put("/units/:id", optionalAuth, SettingsController.updateUnit);
router.delete("/units/:id", optionalAuth, SettingsController.deleteUnit);

// Notifications
router.get("/notifications", optionalAuth, SettingsController.getNotifications);
router.put("/notifications", optionalAuth, SettingsController.updateNotifications);

// System
router.get("/system", optionalAuth, SettingsController.getSystem);
router.put("/system", optionalAuth, SettingsController.updateSystem);

export default router;
