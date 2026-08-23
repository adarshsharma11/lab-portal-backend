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
    let patientId = data.patientId;
    let sampleId = data.sampleId;
    let doctorId = data.doctorId;

    if (!patientId) {
      const p = await prisma.patient.findFirst();
      if (p) patientId = p.id;
    }
    if (!sampleId) {
      const s = await prisma.sample.findFirst();
      if (s) sampleId = s.id;
    }
    if (!doctorId) {
      const d = await prisma.doctor.findFirst();
      if (d) doctorId = d.id;
    }

    const reportNumber = data.reportNumber || `RPT-${Date.now().toString().slice(-6)}`;

    const created = await prisma.report.create({
      data: {
        reportNumber,
        patientId,
        sampleId,
        doctorId,
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

export const createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const tests = Array.isArray(data.tests)
      ? data.tests
      : typeof data.tests === "string"
      ? data.tests.split(",").map((t: string) => t.trim())
      : [];

    const created = await prisma.reportTemplate.create({
      data: {
        name: data.name,
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
        ? data.tests.split(",").map((t: string) => t.trim())
        : undefined
      : undefined;

    const updated = await prisma.reportTemplate.update({
      where: { id },
      data: {
        name: data.name,
        department: data.department,
        tests,
        header: data.header,
        footer: data.footer,
        referenceRanges: data.referenceRanges,
        notes: data.notes,
        signatory: data.signatory,
        active: data.active,
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
