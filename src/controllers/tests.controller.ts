import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest, getTenantScope } from "../middleware/auth.middleware";

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    if (isFranchise && !userFranchiseId) {
      res.json({ data: [] });
      return;
    }

    let whereClause: any = {};
    if (isFranchise && userFranchiseId) {
      whereClause = {
        OR: [
          { franchiseId: userFranchiseId },
          { franchiseId: null },
          { sample: { franchiseId: userFranchiseId } },
        ],
      };
    } else if (effectiveFranchiseId) {
      whereClause = {
        OR: [
          { franchiseId: effectiveFranchiseId },
          { sample: { franchiseId: effectiveFranchiseId } },
        ],
      };
    }

    if (search) {
      whereClause = {
        AND: [
          whereClause,
          {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { department: { contains: search, mode: "insensitive" } },
            ],
          },
        ],
      };
    }

    const tests = await prisma.test.findMany({
      where: whereClause,
      include: {
        franchise: { select: { id: true, name: true, code: true, city: true } },
        sample: {
          select: { id: true, accession: true, patient: { select: { id: true, name: true } } },
        },
        results: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: tests });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        franchise: { select: { id: true, name: true, code: true, city: true } },
        sample: {
          include: { patient: true },
        },
        results: true,
      },
    });
    if (!test) {
      res.status(404).json({ message: "Test not found" });
      return;
    }

    if (isFranchise && test.franchiseId && test.franchiseId !== userFranchiseId && test.sample?.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Test belongs to another franchise." });
      return;
    }

    res.json({ data: test });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Test name is required" });
      return;
    }
    if (!data.code || typeof data.code !== "string" || !data.code.trim()) {
      res.status(400).json({ message: "Test code is required" });
      return;
    }

    let sampleId: string | null = null;
    if (data.sampleId && typeof data.sampleId === "string" && data.sampleId.trim()) {
      const existingSample = await prisma.sample.findFirst({
        where: {
          OR: [
            { id: data.sampleId.trim() },
            { accession: data.sampleId.trim() },
            { barcode: data.sampleId.trim() },
          ],
        },
      });
      if (existingSample) sampleId = existingSample.id;
    }

    const franchiseId = isFranchise
      ? userFranchiseId
      : (data.franchiseId || null);

    const created = await prisma.test.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        department: data.department || "Hematology",
        sampleId,
        franchiseId,
        sampleType: data.sampleType || "Blood",
        price: Number(data.price) || 0,
        referenceRange: data.referenceRange || null,
        unit: data.unit || null,
        turnaroundHours: Number(data.turnaroundHours) || 4,
        status: data.status || "Active",
      },
      include: {
        franchise: true,
        sample: true,
      },
    });

    await prisma.auditActivity.create({
      data: {
        type: "Test registered",
        subject: created.name,
        detail: `${created.department} · ${created.code}`,
        time: "Just now",
      },
    }).catch(() => {});

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

    const existing = await prisma.test.findUnique({ 
      where: { id },
      include: { sample: true },
    });
    if (!existing) {
      res.status(404).json({ message: "Test not found" });
      return;
    }

    if (isFranchise && existing.franchiseId && existing.franchiseId !== userFranchiseId && existing.sample?.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot update test belonging to another franchise." });
      return;
    }

    let sampleIdUpdate: string | null | undefined = undefined;
    if (data.sampleId !== undefined) {
      if (!data.sampleId || (typeof data.sampleId === "string" && !data.sampleId.trim())) {
        sampleIdUpdate = null;
      } else {
        const existingSample = await prisma.sample.findFirst({
          where: {
            OR: [
              { id: String(data.sampleId).trim() },
              { accession: String(data.sampleId).trim() },
              { barcode: String(data.sampleId).trim() },
            ],
          },
        });
        sampleIdUpdate = existingSample ? existingSample.id : null;
      }
    }

    const updated = await prisma.test.update({
      where: { id },
      data: {
        code: data.code ? data.code.trim().toUpperCase() : undefined,
        name: data.name ? data.name.trim() : undefined,
        department: data.department,
        sampleId: sampleIdUpdate,
        franchiseId: isFranchise ? undefined : (data.franchiseId !== undefined ? data.franchiseId : undefined),
        sampleType: data.sampleType,
        price: data.price !== undefined ? Number(data.price) : undefined,
        referenceRange: data.referenceRange,
        unit: data.unit,
        turnaroundHours: data.turnaroundHours !== undefined ? Number(data.turnaroundHours) : undefined,
        status: data.status,
      },
      include: {
        franchise: true,
        sample: true,
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

    const existing = await prisma.test.findUnique({ 
      where: { id },
      include: { sample: true },
    });
    if (!existing) {
      res.status(404).json({ message: "Test not found" });
      return;
    }

    if (isFranchise && existing.franchiseId && existing.franchiseId !== userFranchiseId && existing.sample?.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot delete test belonging to another franchise." });
      return;
    }

    await prisma.test.delete({ where: { id } });
    res.json({ message: "Test deleted successfully" });
  } catch (error) {
    next(error);
  }
};
