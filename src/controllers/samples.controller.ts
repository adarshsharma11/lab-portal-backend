import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const samples = await prisma.sample.findMany({
      include: {
        patient: { select: { id: true, name: true, patientCode: true } },
        tests: true,
      },
      orderBy: { collectedAt: "desc" },
    });
    res.json({ data: samples });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const sample = await prisma.sample.findUnique({
      where: { id },
      include: {
        patient: true,
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
    res.json({ data: sample });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    let patientId = data.patientId;

    if (!patientId) {
      const firstPatient = await prisma.patient.findFirst();
      if (firstPatient) patientId = firstPatient.id;
    }

    const accession = data.accession || `LIS-${Date.now().toString().slice(-6)}`;
    const barcode = data.barcode || `BC${Date.now()}`;

    const created = await prisma.sample.create({
      data: {
        accession,
        barcode,
        patientId,
        sampleType: data.sampleType || "Blood",
        collectedAt: data.collectedAt ? new Date(data.collectedAt) : new Date(),
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : null,
        receivedBy: data.receivedBy || null,
        priority: data.priority || "Routine",
        status: data.status || "Collected",
        notes: data.notes || null,
      },
      include: { patient: true },
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

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.sample.update({
      where: { id },
      data: {
        accession: data.accession,
        barcode: data.barcode,
        patientId: data.patientId,
        sampleType: data.sampleType,
        collectedAt: data.collectedAt ? new Date(data.collectedAt) : undefined,
        receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
        receivedBy: data.receivedBy,
        priority: data.priority,
        status: data.status,
        notes: data.notes,
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
    await prisma.sample.delete({ where: { id } });
    res.json({ message: "Sample deleted successfully" });
  } catch (error) {
    next(error);
  }
};
