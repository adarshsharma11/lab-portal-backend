import { Router } from "express";
import * as DashboardController from "../controllers/dashboard.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/stats", optionalAuth, DashboardController.getStats);
router.get("/test-volume", optionalAuth, DashboardController.getTestVolume);
router.get("/department-distribution", optionalAuth, DashboardController.getDepartmentDistribution);
router.get("/sample-statistics", optionalAuth, DashboardController.getSampleStatistics);
router.get("/revenue", optionalAuth, DashboardController.getRevenue);
router.get("/turnaround", optionalAuth, DashboardController.getTurnaround);
router.get("/recent-activity", optionalAuth, DashboardController.getRecentActivity);
router.get("/pending-work", optionalAuth, DashboardController.getPendingWork);
router.get("/critical-results", optionalAuth, DashboardController.getCriticalResults);

export default router;
