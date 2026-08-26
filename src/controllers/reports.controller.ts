import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const listReports = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        patient: { select: { id: true, name: true, patientCode: true } },
        doctor: { select: { id: true, name: true } },
        sample: { select: { id: true, accession: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: reports });
  } catch (error) {
    next(error);
  }
};

export const getReportById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        sample: {
          include: {
            tests: {
              include: { results: true },
            },
          },
        },
      },
    });
    if (!report) {
      res.status(404).json({ message: "Report not found" });
      return;
    }
    res.json({ data: report });
  } catch (error) {
    next(error);
  }
};

export const createReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    let patient = null;
    let sample = null;
    let doctor = null;

    if (data.patientId && typeof data.patientId === "string" && data.patientId.trim()) {
      const pid = data.patientId.trim();
      patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { id: pid },
            { patientCode: { equals: pid, mode: "insensitive" } },
            { name: { contains: pid, mode: "insensitive" } },
          ],
        },
      });
    }
    if (!patient) patient = await prisma.patient.findFirst();
    if (!patient) {
      res.status(400).json({ message: "No patient found. Please create a patient first." });
      return;
    }

    if (data.sampleId && typeof data.sampleId === "string" && data.sampleId.trim()) {
      const sid = data.sampleId.trim();
      sample = await prisma.sample.findFirst({
        where: {
          OR: [
            { id: sid },
            { accession: { equals: sid, mode: "insensitive" } },
            { barcode: { equals: sid, mode: "insensitive" } },
          ],
        },
      });
    }
    if (!sample) sample = await prisma.sample.findFirst();
    if (!sample) {
      res.status(400).json({ message: "No sample found. Please create a sample first." });
      return;
    }

    if (data.doctorId && typeof data.doctorId === "string" && data.doctorId.trim()) {
      const did = data.doctorId.trim();
      doctor = await prisma.doctor.findFirst({
        where: {
          OR: [
            { id: did },
            { name: { contains: did, mode: "insensitive" } },
          ],
        },
      });
    }
    if (!doctor) doctor = await prisma.doctor.findFirst();
    if (!doctor) {
      res.status(400).json({ message: "No doctor found. Please create a doctor first." });
      return;
    }

    const reportNumber = data.reportNumber && data.reportNumber.trim()
      ? data.reportNumber.trim()
      : `RPT-${Date.now().toString().slice(-6)}`;

    const created = await prisma.report.create({
      data: {
        reportNumber,
        patientId: patient.id,
        sampleId: sample.id,
        doctorId: doctor.id,
        testIds: Array.isArray(data.testIds) ? data.testIds : [],
        resultIds: Array.isArray(data.resultIds) ? data.resultIds : [],
        department: data.department || "Hematology",
        priority: data.priority || "Routine",
        status: data.status || "Pending Review",
        pathologist: data.pathologist || null,
        comments: data.comments || null,
      },
    });

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const updateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: data.status,
        pathologist: data.pathologist,
        comments: data.comments,
        department: data.department,
        priority: data.priority,
        testIds: data.testIds,
        resultIds: data.resultIds,
      },
    });

    if (data.status === "Approved") {
      await prisma.auditActivity.create({
        data: {
          type: "Report approved",
          subject: updated.reportNumber,
          detail: `Report approved by ${updated.pathologist || "Pathologist"}`,
          time: "Just now",
        },
      }).catch(() => {});
    }

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.report.delete({ where: { id } });
    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Templates
export const listTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const templates = await prisma.reportTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: templates });
  } catch (error) {
    next(error);
  }
};

export const getTemplateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const template = await prisma.reportTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      res.status(404).json({ message: "Report template not found" });
      return;
    }
    res.json({ data: template });
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Template name is required" });
      return;
    }

    const tests = Array.isArray(data.tests)
      ? data.tests
      : typeof data.tests === "string"
      ? data.tests.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];

    const created = await prisma.reportTemplate.create({
      data: {
        name: data.name.trim(),
        department: data.department || "Hematology",
        tests,
        header: data.header || "BLDignostics LIMS Reference Laboratory",
        footer: data.footer || "This is a computer-generated report.",
        referenceRanges: data.referenceRanges || null,
        notes: data.notes || null,
        signatory: data.signatory || "Dr. Ananya Rao",
        active: data.active !== undefined ? Boolean(data.active) : true,
      },
    });
    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const tests = data.tests
      ? Array.isArray(data.tests)
        ? data.tests
        : typeof data.tests === "string"
        ? data.tests.split(",").map((t: string) => t.trim()).filter(Boolean)
        : undefined
      : undefined;

    const updated = await prisma.reportTemplate.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        department: data.department,
        tests,
        header: data.header,
        footer: data.footer,
        referenceRanges: data.referenceRanges !== undefined ? data.referenceRanges : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        signatory: data.signatory,
        active: data.active !== undefined ? Boolean(data.active) : undefined,
      },
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.reportTemplate.delete({ where: { id } });
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    next(error);
  }
};
