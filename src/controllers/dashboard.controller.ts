import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest, getTenantScope } from "../middleware/auth.middleware";

export const getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const franchiseId = isFranchise ? userFranchiseId : effectiveFranchiseId;

    // Fetch franchise details if scoped
    let franchise = null;
    if (franchiseId) {
      franchise = await prisma.franchise.findUnique({ where: { id: franchiseId } });
    }

    const [
      totalPatients,
      samplesToday,
      pendingTests,
      completedTests,
      pendingReports,
      reportsToday,
      criticalResults,
      invoices,
      totalDoctors,
      totalStaff,
    ] = await Promise.all([
      prisma.patient.count({ where: franchiseId ? { franchiseId } : undefined }),
      prisma.sample.count({ where: { collectedAt: { gte: today }, ...(franchiseId ? { franchiseId } : {}) } }),
      prisma.test.count({ where: { sample: { status: { in: ["Collected", "Received", "Processing"] }, ...(franchiseId ? { franchiseId } : {}) } } }),
      prisma.test.count({ where: { sample: { status: "Completed", ...(franchiseId ? { franchiseId } : {}) } } }),
      prisma.report.count({ where: { status: "Pending Review", ...(franchiseId ? { franchiseId } : {}) } }),
      prisma.report.count({ where: { createdAt: { gte: today }, ...(franchiseId ? { franchiseId } : {}) } }),
      prisma.result.count({ 
        where: { 
          criticalFlag: true,
          ...(franchiseId ? { test: { OR: [{ franchiseId }, { sample: { franchiseId } }] } } : {})
        } 
      }),
      prisma.invoice.findMany({ 
        where: franchiseId ? { franchiseId } : undefined, 
        select: { total: true, paymentStatus: true, createdAt: true } 
      }),
      prisma.doctor.count({ where: franchiseId ? { franchiseId } : undefined }),
      prisma.user.count({ where: franchiseId ? { franchiseId } : undefined }),
    ]);

    const totalRevenue = (invoices as { total: number; paymentStatus: string }[])
      .reduce((acc, inv) => acc + (inv.total || 0), 0);

    const paidRevenue = (invoices as { total: number; paymentStatus: string }[])
      .filter(inv => inv.paymentStatus === "Paid")
      .reduce((acc, inv) => acc + (inv.total || 0), 0);

    const pendingRevenue = totalRevenue - paidRevenue;

    const revenueShareRate = franchise?.revenueShare || 20; // default 20%
    const franchiseShareAmount = Math.round((totalRevenue * revenueShareRate) / 100);

    res.json({
      data: {
        totalPatients,
        samplesToday,
        pendingTests,
        completedTests,
        pendingReports,
        reportsToday,
        criticalResults,
        totalDoctors,
        totalStaff,
        revenue: totalRevenue,
        paidRevenue,
        pendingRevenue,
        revenueShareRate,
        franchiseShareAmount,
        franchiseName: franchise?.name || null,
        franchiseCode: franchise?.code || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTestVolume = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const defaultData = [
      { label: "Mon", value: 182 },
      { label: "Tue", value: 216 },
      { label: "Wed", value: 194 },
      { label: "Thu", value: 248 },
      { label: "Fri", value: 229 },
      { label: "Sat", value: 156 },
      { label: "Sun", value: 113 },
    ];
    res.json({ data: defaultData });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentDistribution = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const franchiseId = isFranchise ? userFranchiseId : effectiveFranchiseId;

    const tests = await prisma.test.findMany({ 
      where: franchiseId ? { OR: [{ franchiseId }, { sample: { franchiseId } }] } : undefined,
      select: { department: true } 
    });

    if (tests.length === 0) {
      res.json({
        data: [
          { label: "Hematology", value: 38 },
          { label: "Biochemistry", value: 31 },
          { label: "Urine", value: 14 },
          { label: "Electrolytes", value: 10 },
          { label: "Other", value: 7 },
        ],
      });
      return;
    }

    const counts: Record<string, number> = {};
    (tests as { department: string }[]).forEach((t: { department: string }) => {
      counts[t.department] = (counts[t.department] || 0) + 1;
    });

    const result = Object.entries(counts).map(([label, value]: [string, number]) => ({ label, value }));
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const getSampleStatistics = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const franchiseId = isFranchise ? userFranchiseId : effectiveFranchiseId;

    const samples = await prisma.sample.findMany({
      where: franchiseId ? { franchiseId } : undefined,
      select: { status: true },
    });
    const counts: Record<string, number> = { Collected: 0, Received: 0, Processing: 0, Completed: 0, Rejected: 0 };

    (samples as { status: string }[]).forEach((s: { status: string }) => {
      if (counts[s.status] !== undefined) {
        counts[s.status]++;
      }
    });

    const result = Object.entries(counts).map(([label, value]: [string, number]) => ({ label, value }));
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const getRevenue = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const franchiseId = isFranchise ? userFranchiseId : effectiveFranchiseId;

    const invoices = await prisma.invoice.findMany({
      where: franchiseId ? { franchiseId } : undefined,
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    if (invoices.length === 0) {
      const defaultData = [
        { label: "Mar", value: 142 },
        { label: "Apr", value: 158 },
        { label: "May", value: 151 },
        { label: "Jun", value: 172 },
        { label: "Jul", value: 165 },
        { label: "Aug", value: 185 },
      ];
      res.json({ data: defaultData });
      return;
    }

    const monthMap: Record<string, number> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    invoices.forEach(inv => {
      const d = new Date(inv.createdAt);
      const m = months[d.getMonth()];
      monthMap[m] = (monthMap[m] || 0) + (inv.total || 0);
    });

    const data = Object.entries(monthMap).map(([label, value]) => ({
      label,
      value: Math.round(value / 1000) || value, // in thousands or raw
    }));

    res.json({ data: data.length > 0 ? data : [{ label: "Aug", value: 185 }] });
  } catch (error) {
    next(error);
  }
};

export const getTurnaround = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const turnaround = [
      { label: "Hematology", value: 2.1 },
      { label: "Biochemistry", value: 3.4 },
      { label: "Urine", value: 1.8 },
      { label: "Electrolytes", value: 1.5 },
    ];
    res.json({ data: turnaround });
  } catch (error) {
    next(error);
  }
};

export const getRecentActivity = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activities = await prisma.auditActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    res.json({ data: activities });
  } catch (error) {
    next(error);
  }
};

export const getPendingWork = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const franchiseId = isFranchise ? userFranchiseId : effectiveFranchiseId;

    const pendingSamples = await prisma.sample.findMany({
      where: {
        status: { in: ["Collected", "Received", "Processing"] },
        ...(franchiseId ? { franchiseId } : {}),
      },
      include: {
        patient: true,
        tests: true,
      },
      orderBy: { collectedAt: "desc" },
      take: 10,
    });

    const pendingWork = (pendingSamples as any[]).map((sample: any, idx: number) => ({
      id: `w-${sample.id}`,
      patient: sample.patient?.name || "Unknown Patient",
      sampleId: sample.accession,
      test: sample.tests?.[0]?.name || "Diagnostic Panel",
      department: sample.tests?.[0]?.department || "Hematology",
      priority: (sample.priority as "Routine" | "Urgent" | "STAT") || "Routine",
      status: (sample.status as "Collected" | "Received" | "Processing" | "Completed" | "Rejected") || "Collected",
      collectedAt: new Date(sample.collectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      technician: idx % 2 === 0 ? "R. Iyer" : "S. Das",
    }));

    res.json({ data: pendingWork });
  } catch (error) {
    next(error);
  }
};

export const getCriticalResults = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const franchiseId = isFranchise ? userFranchiseId : effectiveFranchiseId;

    const criticalResults = await prisma.result.findMany({
      where: { 
        criticalFlag: true,
        ...(franchiseId ? { test: { OR: [{ franchiseId }, { sample: { franchiseId } }] } } : {})
      },
      include: {
        test: {
          include: {
            sample: {
              include: { patient: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const formatted = (criticalResults as any[]).map((r: any) => ({
      id: r.id,
      patient: r.test?.sample?.patient?.name || "Unknown Patient",
      test: `${r.test?.name || "Test"} (${r.parameter})`,
      result: `${r.value} ${r.unit}`,
      criticalValue: r.referenceRange || "Out of Range",
      time: new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Unreviewed" as const,
    }));

    res.json({ data: formatted });
  } catch (error) {
    next(error);
  }
};
