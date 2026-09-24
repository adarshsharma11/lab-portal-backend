import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest, getTenantScope } from "../middleware/auth.middleware";

export const testSubParametersController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { effectiveFranchiseId } = getTenantScope(req as AuthenticatedRequest);
      const mainParameter = req.query.mainParameter as string | undefined;
      const department = req.query.department as string | undefined;

      // 1. Fetch default global sub-parameters (franchiseId: null)
      const defaultWhere: any = { franchiseId: null };
      if (mainParameter) {
        defaultWhere.mainParameter = { equals: mainParameter, mode: "insensitive" };
      }
      if (department) {
        defaultWhere.department = { equals: department, mode: "insensitive" };
      }

      const defaultRecords = await prisma.testSubParameter.findMany({
        where: defaultWhere,
        orderBy: [{ department: "asc" }, { mainParameter: "asc" }, { orderIndex: "asc" }],
      });

      // 2. If a specific franchise is active, fetch franchise-specific sub-parameters
      if (effectiveFranchiseId && effectiveFranchiseId !== "__NO_FRANCHISE_ACCESS__" && effectiveFranchiseId !== "all") {
        const franchiseWhere: any = { franchiseId: effectiveFranchiseId };
        if (mainParameter) {
          franchiseWhere.mainParameter = { equals: mainParameter, mode: "insensitive" };
        }
        if (department) {
          franchiseWhere.department = { equals: department, mode: "insensitive" };
        }

        const franchiseRecords = await prisma.testSubParameter.findMany({
          where: franchiseWhere,
          orderBy: [{ department: "asc" }, { mainParameter: "asc" }, { orderIndex: "asc" }],
        });

        if (franchiseRecords.length > 0) {
          // Group franchise records by uppercase mainParameter
          const franchiseMainParams = new Set(
            franchiseRecords.map((r) => r.mainParameter.toUpperCase().trim())
          );

          // Keep default records only for mainParameters not overridden by the franchise
          const nonOverriddenDefaults = defaultRecords.filter(
            (r) => !franchiseMainParams.has(r.mainParameter.toUpperCase().trim())
          );

          const merged = [...franchiseRecords, ...nonOverriddenDefaults].sort((a, b) => {
            if (a.department !== b.department) return a.department.localeCompare(b.department);
            if (a.mainParameter !== b.mainParameter) return a.mainParameter.localeCompare(b.mainParameter);
            return a.orderIndex - b.orderIndex;
          });

          res.json({
            success: true,
            data: merged,
            total: merged.length,
            message: "Franchise-scoped test sub-parameters retrieved successfully",
          });
          return;
        }
      }

      // Default response
      res.json({
        success: true,
        data: defaultRecords,
        total: defaultRecords.length,
        message: "Test sub-parameters retrieved successfully",
      });
    } catch (error) {
      console.error("Failed to list test sub-parameters:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  async getByMainParameter(req: Request, res: Response): Promise<void> {
    try {
      const { effectiveFranchiseId } = getTenantScope(req as AuthenticatedRequest);
      const { mainParameter } = req.params;

      // 1. If franchise is active, check for franchise-specific records first
      if (effectiveFranchiseId && effectiveFranchiseId !== "__NO_FRANCHISE_ACCESS__" && effectiveFranchiseId !== "all") {
        const franchiseRecords = await prisma.testSubParameter.findMany({
          where: {
            mainParameter: { equals: mainParameter, mode: "insensitive" },
            franchiseId: effectiveFranchiseId,
          },
          orderBy: { orderIndex: "asc" },
        });

        if (franchiseRecords.length > 0) {
          res.json({
            success: true,
            data: franchiseRecords,
            total: franchiseRecords.length,
            message: "Franchise-specific sub-parameters retrieved successfully",
          });
          return;
        }
      }

      // 2. Fallback to default global records
      const defaultRecords = await prisma.testSubParameter.findMany({
        where: {
          mainParameter: { equals: mainParameter, mode: "insensitive" },
          franchiseId: null,
        },
        orderBy: { orderIndex: "asc" },
      });

      res.json({
        success: true,
        data: defaultRecords,
        total: defaultRecords.length,
        message: "Default sub-parameters retrieved successfully",
      });
    } catch (error) {
      console.error("Failed to get sub-parameters by main parameter:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

