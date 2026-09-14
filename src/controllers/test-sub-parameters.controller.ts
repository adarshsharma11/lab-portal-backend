import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const testSubParametersController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const mainParameter = req.query.mainParameter as string | undefined;
      const department = req.query.department as string | undefined;

      const where: any = {};
      if (mainParameter) {
        where.mainParameter = { equals: mainParameter, mode: "insensitive" };
      }
      if (department) {
        where.department = { equals: department, mode: "insensitive" };
      }

      const subParameters = await prisma.testSubParameter.findMany({
        where,
        orderBy: [{ department: "asc" }, { mainParameter: "asc" }, { orderIndex: "asc" }],
      });

      res.json({
        success: true,
        data: subParameters,
        total: subParameters.length,
        message: "Test sub-parameters retrieved successfully",
      });
    } catch (error) {
      console.error("Failed to list test sub-parameters:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  async getByMainParameter(req: Request, res: Response): Promise<void> {
    try {
      const { mainParameter } = req.params;
      const subParameters = await prisma.testSubParameter.findMany({
        where: {
          mainParameter: { equals: mainParameter, mode: "insensitive" },
        },
        orderBy: { orderIndex: "asc" },
      });

      res.json({
        success: true,
        data: subParameters,
        total: subParameters.length,
      });
    } catch (error) {
      console.error("Failed to get sub-parameters by main parameter:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};
