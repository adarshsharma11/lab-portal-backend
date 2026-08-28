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
    if (isFranchise) {
      whereClause = { franchiseId: userFranchiseId };
    } else if (effectiveFranchiseId) {
      whereClause = { franchiseId: effectiveFranchiseId };
    }

    if (search) {
      whereClause = {
        AND: [
          whereClause,
          {
            OR: [
              { accession: { contains: search, mode: "insensitive" } },
              { barcode: { contains: search, mode: "insensitive" } },
              { patient: { name: { contains: search, mode: "insensitive" } } },
            ],
          },
        ],
      };
    }

    const samples = await prisma.sample.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, patientCode: true, age: true, sex: true, phone: true } },
        franchise: { select: { id: true, name: true, code: true, city: true } },
        tests: true,
      },
      orderBy: { collectedAt: "desc" },
    });
    res.json({ data: samples });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const sample = await prisma.sample.findUnique({
      where: { id },
      include: {
        patient: true,
        franchise: { select: { id: true, name: true, code: true, city: true } },
        tests: {
          include: { results: true },
        },
        reports: true,
      },
    });
    if (!sample) {
      res.status(404).json({ message: "Sample not found" });
      return;
    }

    if (isFranchise && sample.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Sample belongs to another franchise." });
      return;
    }

    res.json({ data: sample });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    let patient = null;
    if (data.patientId && typeof data.patientId === "string" && data.patientId.trim()) {
      const pid = data.patientId.trim();
      patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { id: pid },
            { patientCode: { equals: pid, mode: "insensitive" } },
            { name: { contains: pid, mode: "insensitive" } },
          ],
          ...(isFranchise && userFranchiseId ? { franchiseId: userFranchiseId } : {}),
        },
      });
    }

    if (!patient) {
      patient = await prisma.patient.findFirst({
        where: isFranchise && userFranchiseId ? { franchiseId: userFranchiseId } : undefined,
      });
    }

    if (!patient) {
      res.status(400).json({ message: "No registered patient found. Please register a patient before creating a sample." });
      return;
    }

    const franchiseId = isFranchise
      ? userFranchiseId
      : (data.franchiseId || patient.franchiseId || null);

    const accession = data.accession && data.accession.trim()
      ? data.accession.trim()
      : `LIS-${Date.now().toString().slice(-6)}`;
    const barcode = data.barcode && data.barcode.trim()
      ? data.barcode.trim()
      : `BC${Date.now().toString().slice(-8)}`;

    let collectedAt = new Date();
    if (data.collectedAt) {
      const parsed = new Date(data.collectedAt);
      if (!isNaN(parsed.getTime())) collectedAt = parsed;
    }

    let receivedAt: Date | null = null;
    if (data.receivedAt) {
      const parsed = new Date(data.receivedAt);
      if (!isNaN(parsed.getTime())) receivedAt = parsed;
    }

    const created = await prisma.sample.create({
      data: {
        accession,
        barcode,
        patientId: patient.id,
        franchiseId,
        sampleType: data.sampleType || "Blood",
        collectedAt,
        receivedAt,
        receivedBy: data.receivedBy || null,
        priority: data.priority || "Routine",
        status: data.status || "Collected",
        notes: data.notes || null,
      },
      include: { 
        patient: true,
        franchise: true,
      },
    });

    await prisma.auditActivity.create({
      data: {
        type: "Sample collected",
        subject: created.accession,
        detail: `${created.patient.name} · ${created.sampleType}`,
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

    const existing = await prisma.sample.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Sample not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot update sample belonging to another franchise." });
      return;
    }

    let patientIdUpdate: string | undefined = undefined;
    if (data.patientId && typeof data.patientId === "string" && data.patientId.trim()) {
      const pid = data.patientId.trim();
      const patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { id: pid },
            { patientCode: { equals: pid, mode: "insensitive" } },
            { name: { contains: pid, mode: "insensitive" } },
          ],
        },
      });
      if (patient) patientIdUpdate = patient.id;
    }

    let collectedAtUpdate: Date | undefined = undefined;
    if (data.collectedAt) {
      const parsed = new Date(data.collectedAt);
      if (!isNaN(parsed.getTime())) collectedAtUpdate = parsed;
    }

    let receivedAtUpdate: Date | null | undefined = undefined;
    if (data.receivedAt !== undefined) {
      if (!data.receivedAt) {
        receivedAtUpdate = null;
      } else {
        const parsed = new Date(data.receivedAt);
        if (!isNaN(parsed.getTime())) receivedAtUpdate = parsed;
      }
    }

    const updated = await prisma.sample.update({
      where: { id },
      data: {
        accession: data.accession,
        barcode: data.barcode,
        patientId: patientIdUpdate,
        franchiseId: isFranchise ? undefined : (data.franchiseId !== undefined ? data.franchiseId : undefined),
        sampleType: data.sampleType,
        collectedAt: collectedAtUpdate,
        receivedAt: receivedAtUpdate,
        receivedBy: data.receivedBy,
        priority: data.priority,
        status: data.status,
        notes: data.notes,
      },
      include: {
        patient: true,
        franchise: true,
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

    const existing = await prisma.sample.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Sample not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot delete sample belonging to another franchise." });
      return;
    }

    await prisma.sample.delete({ where: { id } });
    res.json({ message: "Sample deleted successfully" });
  } catch (error) {
    next(error);
  }
};
