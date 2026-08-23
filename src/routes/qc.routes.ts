import { Router } from "express";
import * as QCController from "../controllers/qc.controller";
import { optionalAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/dashboard", optionalAuth, QCController.getDashboard);
router.get("/runs", optionalAuth, QCController.listRuns);
router.get("/runs/:id", optionalAuth, QCController.getRun);
router.get("/parameters", optionalAuth, QCController.listParameters);
router.get("/parameters/:id", optionalAuth, QCController.getParameter);
router.get("/violations", optionalAuth, QCController.listViolations);
router.post("/violations/:id/review", optionalAuth, QCController.reviewViolation);
router.get("/chart/:parameterId", optionalAuth, QCController.getChartData);

export default router;
