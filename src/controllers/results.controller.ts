import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest, getTenantScope } from "../middleware/auth.middleware";

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);

    let whereClause: any = {};
    if (isFranchise && userFranchiseId) {
      whereClause = {
        test: {
          OR: [
            { franchiseId: userFranchiseId },
            { sample: { franchiseId: userFranchiseId } },
          ],
        },
      };
    } else if (effectiveFranchiseId) {
      whereClause = {
        test: {
          OR: [
            { franchiseId: effectiveFranchiseId },
            { sample: { franchiseId: effectiveFranchiseId } },
          ],
        },
      };
    }

    const results = await prisma.result.findMany({
      where: whereClause,
      include: {
        test: {
          select: { 
            id: true, 
            name: true, 
            code: true, 
            department: true,
            franchiseId: true,
            franchise: { select: { id: true, name: true, code: true } }
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const result = await prisma.result.findUnique({
      where: { id },
      include: { 
        test: {
          include: {
            sample: true,
            franchise: true,
          }
        } 
      },
    });
    if (!result) {
      res.status(404).json({ message: "Result not found" });
      return;
    }

    if (isFranchise && result.test.franchiseId && result.test.franchiseId !== userFranchiseId && result.test.sample?.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Result belongs to another franchise." });
      return;
    }

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    let test = null;

    if (data.testId && typeof data.testId === "string" && data.testId.trim()) {
      const tid = data.testId.trim();
      test = await prisma.test.findFirst({
        where: {
          OR: [
            { id: tid },
            { code: { equals: tid, mode: "insensitive" } },
            { name: { contains: tid, mode: "insensitive" } },
          ],
        },
      });
    }

    if (!test) {
      test = await prisma.test.findFirst();
    }

    if (!test) {
      res.status(400).json({ message: "No test catalog found. Please create a test first." });
      return;
    }

    const created = await prisma.result.create({
      data: {
        testId: test.id,
        parameter: data.parameter || test.name,
        value: String(data.value ?? ""),
        unit: data.unit || test.unit || "",
        referenceRange: data.referenceRange || test.referenceRange || "",
        abnormalFlag: Boolean(data.abnormalFlag),
        criticalFlag: Boolean(data.criticalFlag),
        comments: data.comments || null,
      },
    });

    if (created.criticalFlag) {
      await prisma.auditActivity.create({
        data: {
          type: "Critical result",
          subject: created.parameter,
          detail: `${created.parameter} ${created.value} ${created.unit} flagged`,
          time: "Just now",
        },
      }).catch(() => {});
    }

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const existing = await prisma.result.findUnique({
      where: { id },
      include: { test: { include: { sample: true } } },
    });
    if (!existing) {
      res.status(404).json({ message: "Result not found" });
      return;
    }

    if (isFranchise && existing.test.franchiseId && existing.test.franchiseId !== userFranchiseId && existing.test.sample?.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot update result belonging to another franchise." });
      return;
    }

    let testIdUpdate: string | undefined = undefined;
    if (data.testId && typeof data.testId === "string" && data.testId.trim()) {
      const tid = data.testId.trim();
      const test = await prisma.test.findFirst({
        where: {
          OR: [
            { id: tid },
            { code: { equals: tid, mode: "insensitive" } },
            { name: { contains: tid, mode: "insensitive" } },
          ],
        },
      });
      if (test) testIdUpdate = test.id;
    }

    const updated = await prisma.result.update({
      where: { id },
      data: {
        testId: testIdUpdate,
        parameter: data.parameter,
        value: data.value !== undefined ? String(data.value) : undefined,
        unit: data.unit,
        referenceRange: data.referenceRange,
        abnormalFlag: data.abnormalFlag !== undefined ? Boolean(data.abnormalFlag) : undefined,
        criticalFlag: data.criticalFlag !== undefined ? Boolean(data.criticalFlag) : undefined,
        comments: data.comments,
      },
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const existing = await prisma.result.findUnique({
      where: { id },
      include: { test: { include: { sample: true } } },
    });
    if (!existing) {
      res.status(404).json({ message: "Result not found" });
      return;
    }

    if (isFranchise && existing.test.franchiseId && existing.test.franchiseId !== userFranchiseId && existing.test.sample?.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot delete result belonging to another franchise." });
      return;
    }

    await prisma.result.delete({ where: { id } });
    res.json({ message: "Result deleted successfully" });
  } catch (error) {
    next(error);
  }
};
