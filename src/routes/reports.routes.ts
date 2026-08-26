import { Router } from "express";
import * as ReportsController from "../controllers/reports.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

// Templates routes must be before /:id to avoid ID conflict
router.get("/templates", optionalAuth, ReportsController.listTemplates);
router.get("/templates/:id", optionalAuth, ReportsController.getTemplateById);
router.post("/templates", optionalAuth, ReportsController.createTemplate);
router.put("/templates/:id", optionalAuth, ReportsController.updateTemplate);
router.delete("/templates/:id", optionalAuth, ReportsController.deleteTemplate);

// Report routes
router.get("/", optionalAuth, ReportsController.listReports);
router.get("/:id", optionalAuth, ReportsController.getReportById);
router.post("/", optionalAuth, ReportsController.createReport);
router.put("/:id", optionalAuth, ReportsController.updateReport);
router.delete("/:id", optionalAuth, ReportsController.deleteReport);

export default router;
