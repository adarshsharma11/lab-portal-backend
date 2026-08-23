import { Router } from "express";
import * as AnalyzerController from "../controllers/analyzer.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/status", optionalAuth, AnalyzerController.getStatus);
router.get("/results", optionalAuth, AnalyzerController.listResults);
router.get("/orders", optionalAuth, AnalyzerController.listOrders);
router.get("/errors", optionalAuth, AnalyzerController.listErrors);
router.post("/errors/:id/acknowledge", optionalAuth, AnalyzerController.acknowledgeError);

export default router;
