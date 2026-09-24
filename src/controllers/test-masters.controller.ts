import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest, getTenantScope } from "../middleware/auth.middleware";

export const testMastersController = {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { effectiveFranchiseId } = getTenantScope(req as AuthenticatedRequest);
      const search = (req.query.search || req.query.q || "") as string;
      const department = req.query.department as string | undefined;
      const limitParam = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      // Default to 2500 if limit not specified (to load all test master records without truncating), allow up to 5000
      const limit = limitParam !== undefined ? Math.min(Math.max(limitParam, 1), 5000) : 2500;
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const skip = (page - 1) * limit;

      const andConditions: any[] = [];

      // Franchise Scoping:
      // If a franchise is active, only show global tests (franchiseId: null) AND tests assigned to that franchise.
      // Tests assigned exclusively to other franchises are never exposed.
      if (effectiveFranchiseId && effectiveFranchiseId !== "__NO_FRANCHISE_ACCESS__" && effectiveFranchiseId !== "all") {
        andConditions.push({
          OR: [
            { franchiseId: null },
            { franchiseId: effectiveFranchiseId },
          ],
        });
      } else {
        // Global view: show all base/shared tests
        andConditions.push({
          franchiseId: null,
        });
      }

      if (department) {
        andConditions.push({
          department: { equals: department, mode: "insensitive" },
        });
      }

      if (search.trim()) {
        const query = search.trim();
        andConditions.push({
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
            { itemId: { contains: query, mode: "insensitive" } },
            { department: { contains: query, mode: "insensitive" } },
          ],
        });
      }

      const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

      const [testMasters, total] = await Promise.all([
        prisma.testMaster.findMany({
          where,
          take: limit,
          skip,
          orderBy: [{ name: "asc" }],
        }),
        prisma.testMaster.count({ where }),
      ]);

      res.json({
        success: true,
        data: testMasters,
        total,
        message: "Test master catalog retrieved successfully",
      });
    } catch (error) {
      console.error("Failed to list test masters:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const testMaster = await prisma.testMaster.findFirst({
        where: {
          OR: [{ id }, { code: id }, { itemId: id }],
        },
      });

      if (!testMaster) {
        res.status(404).json({ success: false, message: "Test master entry not found" });
        return;
      }

      res.json({
        success: true,
        data: testMaster,
        message: "Test master entry retrieved successfully",
      });
    } catch (error) {
      console.error("Failed to get test master:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { code, name, department, rate, mrp, sampleType, unit, referenceRange, turnaroundHours, franchiseId } = req.body;

      if (!code || !name || !department) {
        res.status(400).json({ success: false, message: "Code, Name, and Department are required" });
        return;
      }

      const created = await prisma.testMaster.create({
        data: {
          code: code.trim(),
          name: name.trim(),
          department: department.trim(),
          rate: Number(rate) || 0,
          mrp: Number(mrp) || Number(rate) || 0,
          sampleType: sampleType || "Blood",
          unit: unit || "",
          referenceRange: referenceRange || "",
          turnaroundHours: Number(turnaroundHours) || 24,
          franchiseId: franchiseId || null,
          status: "Active",
        },
      });

      res.status(201).json({
        success: true,
        data: created,
        message: "Test master entry created successfully",
      });
    } catch (error) {
      console.error("Failed to create test master:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const updated = await prisma.testMaster.update({
        where: { id },
        data: {
          ...(data.code && { code: data.code.trim() }),
          ...(data.name && { name: data.name.trim() }),
          ...(data.department && { department: data.department.trim() }),
          ...(data.rate !== undefined && { rate: Number(data.rate) }),
          ...(data.mrp !== undefined && { mrp: Number(data.mrp) }),
          ...(data.sampleType !== undefined && { sampleType: data.sampleType }),
          ...(data.unit !== undefined && { unit: data.unit }),
          ...(data.referenceRange !== undefined && { referenceRange: data.referenceRange }),
          ...(data.turnaroundHours !== undefined && { turnaroundHours: Number(data.turnaroundHours) }),
          ...(data.franchiseId !== undefined && { franchiseId: data.franchiseId || null }),
          ...(data.status && { status: data.status }),
        },
      });

      res.json({
        success: true,
        data: updated,
        message: "Test master entry updated successfully",
      });
    } catch (error) {
      console.error("Failed to update test master:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.testMaster.delete({ where: { id } });
      res.json({ success: true, message: "Test master entry deleted successfully" });
    } catch (error) {
      console.error("Failed to delete test master:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

