import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest, getTenantScope } from "../middleware/auth.middleware";

const roundMoney = (value: unknown): number => Math.round((Number(value) || 0) * 100) / 100;

const testsForReport = (report: any): any[] => {
  const sampleTests = report.sample?.tests || [];
  const testIds: string[] = Array.isArray(report.testIds) ? report.testIds : [];
  if (testIds.length === 0) return sampleTests;

  const keys = new Set(testIds.map((id) => String(id).trim().toLowerCase()).filter(Boolean));
  const matched = sampleTests.filter((test: any) =>
    keys.has(String(test.id || "").toLowerCase()) ||
    keys.has(String(test.code || "").toLowerCase()) ||
    keys.has(String(test.name || "").toLowerCase())
  );
  return matched.length > 0 ? matched : sampleTests;
};

const invoiceItemMatchesTest = (item: any, test: any): boolean => {
  const description = String(item?.description || item?.name || item?.testName || "").trim().toLowerCase();
  if (!description) return false;
  const code = String(test.code || "").trim().toLowerCase();
  const name = String(test.name || "").trim().toLowerCase();
  return Boolean(
    (code && description === code) ||
    (name && (description === name || description.includes(name) || name.includes(description)))
  );
};

const priceTest = (test: any, master?: any, invoiceItem?: any, allocatedDiscount = 0) => {
  const mrp = roundMoney(invoiceItem?.mrp ?? master?.mrp ?? test.price ?? 0);
  const rate = roundMoney(invoiceItem?.rate ?? master?.rate ?? test.price ?? 0);
  const explicitDiscount = invoiceItem?.discount !== undefined && invoiceItem?.discount !== null
    ? roundMoney(invoiceItem.discount)
    : null;
  const hasExplicitDiscountPrice =
    invoiceItem?.discountPrice !== undefined ||
    invoiceItem?.net !== undefined ||
    invoiceItem?.amount !== undefined;
  const explicitDiscountPrice = invoiceItem?.discountPrice ?? invoiceItem?.net ?? invoiceItem?.amount;

  let discountPrice = 0;
  if (hasExplicitDiscountPrice) {
    discountPrice = roundMoney(explicitDiscountPrice);
  } else if (Number(test.price) > 0 && (mrp === 0 || roundMoney(test.price) <= mrp)) {
    discountPrice = roundMoney(test.price);
  } else if (rate > 0) {
    discountPrice = rate;
  } else {
    discountPrice = mrp;
  }

  const discount = explicitDiscount !== null
    ? explicitDiscount
    : roundMoney(allocatedDiscount || Math.max(0, mrp - discountPrice));

  if (!hasExplicitDiscountPrice && allocatedDiscount > 0) {
    discountPrice = roundMoney(Math.max(0, mrp - discount));
  }

  return {
    id: test.id,
    code: test.code,
    name: test.name,
    department: test.department,
    sampleType: test.sampleType,
    status: test.status,
    unit: test.unit,
    price: roundMoney(test.price),
    mrp,
    rate,
    discount,
    discountPrice,
  };
};

const attachTestPricing = async (reports: any[]): Promise<any[]> => {
  if (reports.length === 0) return reports;

  const reportsMissingTests = reports.filter((report) => !(report.sample?.tests && report.sample.tests.length));
  const missingSampleIds = [
    ...new Set(reportsMissingTests.map((report) => report.sampleId || report.sample?.id).filter(Boolean)),
  ];
  if (missingSampleIds.length > 0) {
    const extraTests = await prisma.test.findMany({
      where: { sampleId: { in: missingSampleIds } },
    });
    const testsBySample = new Map<string, any[]>();
    for (const test of extraTests) {
      if (!test.sampleId) continue;
      const list = testsBySample.get(test.sampleId) || [];
      list.push(test);
      testsBySample.set(test.sampleId, list);
    }
    for (const report of reports) {
      const sampleId = report.sampleId || report.sample?.id;
      if (!sampleId || (report.sample?.tests && report.sample.tests.length)) continue;
      if (report.sample) {
        report.sample.tests = testsBySample.get(sampleId) || [];
      }
    }
  }

  const allTests = reports.flatMap((report) => testsForReport(report));
  const codes = [...new Set(allTests.map((test) => String(test.code || "").trim()).filter(Boolean))];
  const names = [...new Set(allTests.map((test) => String(test.name || "").trim()).filter(Boolean))];
  const patientIds = [...new Set(reports.map((report) => report.patientId).filter(Boolean))];

  const masterWhere: any[] = [];
  for (const code of codes) {
    masterWhere.push({ code: { equals: code, mode: "insensitive" } });
  }
  for (const name of names) {
    masterWhere.push({ name: { equals: name, mode: "insensitive" } });
  }

  const [masters, invoices] = await Promise.all([
    masterWhere.length > 0
      ? prisma.testMaster.findMany({
          where: { OR: masterWhere },
          select: { code: true, name: true, mrp: true, rate: true },
        })
      : Promise.resolve([]),
    patientIds.length > 0
      ? prisma.invoice.findMany({
          where: { patientId: { in: patientIds } },
          select: { patientId: true, items: true, discount: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const masterByCode = new Map<string, any>();
  const masterByName = new Map<string, any>();
  for (const master of masters) {
    if (master.code) masterByCode.set(String(master.code).toLowerCase(), master);
    if (master.name) masterByName.set(String(master.name).toLowerCase(), master);
  }

  const invoicesByPatient = new Map<string, any[]>();
  for (const invoice of invoices) {
    const list = invoicesByPatient.get(invoice.patientId) || [];
    list.push(invoice);
    invoicesByPatient.set(invoice.patientId, list);
  }

  return reports.map((report) => {
    const tests = testsForReport(report);
    const patientInvoices = invoicesByPatient.get(report.patientId) || [];

    const pricedTests = tests.map((test: any) => {
      const master =
        masterByCode.get(String(test.code || "").toLowerCase()) ||
        masterByName.get(String(test.name || "").toLowerCase());

      let matchedItem: any = null;
      let allocatedDiscount = 0;
      for (const invoice of patientInvoices) {
        const items = Array.isArray(invoice.items) ? invoice.items : [];
        const item = items.find((entry: any) => invoiceItemMatchesTest(entry, test));
        if (!item) continue;
        matchedItem = item;
        const subtotal = items.reduce((sum: number, entry: any) => {
          const qty = Number(entry.quantity) || 1;
          return sum + roundMoney(entry.mrp ?? entry.price ?? 0) * qty;
        }, 0);
        const itemMrp = roundMoney(item.mrp ?? item.price ?? 0) * (Number(item.quantity) || 1);
        if (subtotal > 0 && Number(invoice.discount) > 0 && item.discount === undefined) {
          allocatedDiscount = roundMoney((itemMrp / subtotal) * Number(invoice.discount));
        }
        break;
      }

      const priced = priceTest(test, master, matchedItem, allocatedDiscount);
      return { ...test, ...priced };
    });

    const testsTotalMrp = roundMoney(pricedTests.reduce((sum: number, test: any) => sum + (test.mrp || 0), 0));
    const testsTotalDiscount = roundMoney(pricedTests.reduce((sum: number, test: any) => sum + (test.discount || 0), 0));
    const testsTotalDiscountPrice = roundMoney(pricedTests.reduce((sum: number, test: any) => sum + (test.discountPrice || 0), 0));

    const sample = report.sample
      ? { ...report.sample, tests: pricedTests }
      : report.sample;

    return {
      ...report,
      sample,
      tests: pricedTests,
      testsTotalMrp,
      testsTotalDiscount,
      testsTotalDiscountPrice,
    };
  });
};

export const listReports = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
              { reportNumber: { contains: search, mode: "insensitive" } },
              { patient: { name: { contains: search, mode: "insensitive" } } },
              { sample: { barcode: { contains: search, mode: "insensitive" } } },
            ],
          },
        ],
      };
    }

    const reports = await prisma.report.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, patientCode: true, age: true, sex: true, phone: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
        sample: {
          select: {
            id: true,
            accession: true,
            barcode: true,
            sampleType: true,
            collectedAt: true,
            receivedAt: true,
            status: true,
            tests: {
              select: {
                id: true,
                code: true,
                name: true,
                department: true,
                sampleType: true,
                price: true,
                status: true,
                unit: true,
              },
            },
          },
        },
        franchise: { select: { id: true, name: true, code: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const data = await attachTestPricing(reports);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getReportById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

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

    if (isFranchise && report.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Report belongs to another franchise." });
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

    const [priced] = await attachTestPricing([report]);
    const testsById = new Map<string, any>((priced.tests || []).map((test: any) => [test.id, test]));
    const pricedResults = results.map((result: any) => {
      const pricedTest: any = testsById.get(result.testId) || testsById.get(result.test?.id);
      if (!pricedTest) return result;
      const testPricing = { ...pricedTest };
      delete testPricing.results;
      return {
        ...result,
        mrp: testPricing.mrp,
        discount: testPricing.discount,
        discountPrice: testPricing.discountPrice,
        test: result.test ? { ...result.test, ...testPricing } : testPricing,
      };
    });
    res.json({ data: { ...priced, results: pricedResults } });
  } catch (error) {
    next(error);
  }
};

export const createReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const { isFranchise, userFranchiseId } = getTenantScope(req);
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
      res.status(400).json({ message: "No patient found. Please register a patient first." });
      return;
    }

    let franchiseId: string;
    if (isFranchise) {
      if (!userFranchiseId) {
        res.status(403).json({ message: "User is not assigned to any franchise." });
        return;
      }
      franchiseId = userFranchiseId;
    } else {
      const resolved = (data.franchiseId && typeof data.franchiseId === "string" && data.franchiseId.trim())
        ? data.franchiseId.trim()
        : patient.franchiseId;
      if (!resolved) {
        res.status(400).json({ message: "Franchise selection is required for this report." });
        return;
      }
      franchiseId = resolved;
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
          franchiseId,
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
          franchiseId,
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
          franchiseId,
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
        franchiseId,
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

export const updateReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Report not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot update report belonging to another franchise." });
      return;
    }

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
        franchise: true,
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

export const deleteReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Report not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot delete report belonging to another franchise." });
      return;
    }

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
        header: data.header || "BL Dignostic LIMS Reference Laboratory",
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
