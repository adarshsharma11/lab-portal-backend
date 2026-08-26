import { Router } from "express";
import * as franchisesController from "../controllers/franchises.controller";

const router = Router();

router.get("/", franchisesController.list);
router.get("/:id", franchisesController.getById);
router.post("/", franchisesController.create);
router.put("/:id", franchisesController.update);
router.delete("/:id", franchisesController.remove);

export default router;
