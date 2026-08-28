import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const listReports = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        patient: { select: { id: true, name: true, patientCode: true, age: true, sex: true, phone: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
        sample: { select: { id: true, accession: true, barcode: true, sampleType: true, collectedAt: true, receivedAt: true, status: true } },
        franchise: { select: { id: true, name: true, code: true, city: true } },
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
        franchise: true,
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

    // Fetch individual results if resultIds are specified
    let results: any[] = [];
    if (Array.isArray(report.resultIds) && report.resultIds.length > 0) {
      results = await prisma.result.findMany({
        where: { id: { in: report.resultIds } },
        include: { test: true },
        orderBy: { createdAt: "asc" },
      });
    }

    // If no results found via resultIds, gather results from sample's tests
    if (results.length === 0 && report.sample?.tests) {
      results = report.sample.tests.flatMap((t) => t.results || []);
    }

    res.json({ data: { ...report, results } });
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

    // 1. Resolve Patient
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
      res.status(400).json({ message: "No patient found. Please register a patient first." });
      return;
    }

    // 2. Resolve or Create Sample
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

    if (!sample) {
      const accession = data.accession || `LIS-${Date.now().toString().slice(-6)}`;
      const barcode = data.barcode || `BC${Date.now().toString().slice(-8)}`;
      sample = await prisma.sample.create({
        data: {
          accession,
          barcode,
          patientId: patient.id,
          franchiseId: patient.franchiseId || data.franchiseId || null,
          sampleType: data.sampleType || "Blood",
          collectedAt: data.collectedAt ? new Date(data.collectedAt) : new Date(),
          receivedAt: data.receivedAt ? new Date(data.receivedAt) : new Date(),
          status: "Completed",
          priority: data.priority || "Routine",
        },
      });
    }

    // 3. Resolve Doctor
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
    if (!doctor && patient.referringDoctorId) {
      doctor = await prisma.doctor.findUnique({ where: { id: patient.referringDoctorId } });
    }
    if (!doctor) doctor = await prisma.doctor.findFirst();
    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: {
          name: data.doctorName || "Dr. Self / Clinical OPD",
          specialty: "General Medicine",
          phone: "080-4455-6677",
        },
      });
    }

    // 4. Resolve or Create Test
    const testName = data.testName || (Array.isArray(data.testIds) && data.testIds[0]) || "Complete Blood Count (CBC)";
    const testCode = data.testCode || (testName.includes("CBC") ? "CBC" : testName.slice(0, 6).toUpperCase().replace(/\s+/g, ""));
    const department = data.department || "Hematology";

    let testRecord = await prisma.test.findFirst({
      where: {
        sampleId: sample.id,
        name: { equals: testName, mode: "insensitive" },
      },
    });

    if (!testRecord) {
      testRecord = await prisma.test.create({
        data: {
          code: testCode,
          name: testName,
          department,
          sampleId: sample.id,
          sampleType: data.sampleType || sample.sampleType || "Blood",
          price: Number(data.price) || 500,
          status: "Active",
        },
      });
    }

    // 5. Create Structured Results if provided
    const createdResultIds: string[] = [];
    if (Array.isArray(data.results) && data.results.length > 0) {
      for (const resItem of data.results) {
        if (!resItem || !resItem.parameter) continue;
        const createdRes = await prisma.result.create({
          data: {
            testId: testRecord.id,
            parameter: String(resItem.parameter).trim(),
            value: String(resItem.value ?? "").trim(),
            unit: String(resItem.unit ?? "").trim(),
            referenceRange: String(resItem.referenceRange ?? "").trim(),
            abnormalFlag: Boolean(resItem.abnormalFlag),
            criticalFlag: Boolean(resItem.criticalFlag),
            comments: resItem.comments ? String(resItem.comments).trim() : null,
          },
        });
        createdResultIds.push(createdRes.id);
      }
    }

    // 6. Generate Report Number
    const reportNumber = data.reportNumber && data.reportNumber.trim()
      ? data.reportNumber.trim()
      : `RPT-${Date.now().toString().slice(-8)}`;

    const testIds = Array.isArray(data.testIds) && data.testIds.length > 0
      ? data.testIds
      : [testName];

    const resultIds = createdResultIds.length > 0
      ? createdResultIds
      : Array.isArray(data.resultIds) ? data.resultIds : [];

    const created = await prisma.report.create({
      data: {
        reportNumber,
        patientId: patient.id,
        sampleId: sample.id,
        doctorId: doctor.id,
        franchiseId: patient.franchiseId || data.franchiseId || null,
        testIds,
        resultIds,
        department,
        priority: data.priority || "Routine",
        status: data.status || "Pending Review",
        pathologist: data.pathologist || "Dr. Pranjali Sejwal, MBBS, MD Pathology",
        comments: data.comments || data.interpretation || null,
      },
      include: {
        patient: true,
        doctor: true,
        sample: true,
        franchise: true,
      },
    });

    // Mark sample as Completed
    await prisma.sample.update({
      where: { id: sample.id },
      data: { status: "Completed" },
    }).catch(() => {});

    // Audit Log
    await prisma.auditActivity.create({
      data: {
        type: "Report generated",
        subject: created.reportNumber,
        detail: `${patient.name} · ${testName} (${department})`,
        time: "Just now",
      },
    }).catch(() => {});

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
      include: {
        patient: true,
        doctor: true,
        sample: true,
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
