import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tests = await prisma.test.findMany({
      include: {
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

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
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
    res.json({ data: test });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Test name is required" });
      return;
    }
    if (!data.code || typeof data.code !== "string" || !data.code.trim()) {
      res.status(400).json({ message: "Test code is required" });
      return;
    }

    let sampleId = data.sampleId;
    if (sampleId) {
      const existingSample = await prisma.sample.findFirst({
        where: { OR: [{ id: sampleId }, { accession: sampleId }, { barcode: sampleId }] },
      });
      if (existingSample) sampleId = existingSample.id;
    }
    if (!sampleId) {
      const firstSample = await prisma.sample.findFirst();
      if (firstSample) sampleId = firstSample.id;
    }

    const created = await prisma.test.create({
      data: {
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        department: data.department || "Hematology",
        sampleId,
        sampleType: data.sampleType || "Blood",
        price: Number(data.price) || 0,
        referenceRange: data.referenceRange || null,
        unit: data.unit || null,
        turnaroundHours: Number(data.turnaroundHours) || 4,
        status: data.status || "Active",
      },
    });

    await prisma.auditActivity.create({
      data: {
        type: "Test completed",
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

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.test.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        department: data.department,
        sampleId: data.sampleId,
        sampleType: data.sampleType,
        price: data.price !== undefined ? Number(data.price) : undefined,
        referenceRange: data.referenceRange,
        unit: data.unit,
        turnaroundHours: data.turnaroundHours !== undefined ? Number(data.turnaroundHours) : undefined,
        status: data.status,
      },
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.test.delete({ where: { id } });
    res.json({ message: "Test deleted successfully" });
  } catch (error) {
    next(error);
  }
};
