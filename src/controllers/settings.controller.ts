import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

// Laboratory Info
export const getLaboratory = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let lab = await prisma.laboratorySetting.findUnique({ where: { id: "default" } });
    if (!lab) {
      lab = await prisma.laboratorySetting.create({ data: { id: "default" } });
    }
    res.json({ data: lab });
  } catch (error) {
    next(error);
  }
};

export const updateLaboratory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const lab = await prisma.laboratorySetting.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    if (data.logo !== undefined) {
      await prisma.reportSetting.upsert({
        where: { id: "default" },
        update: {
          logo: data.logo,
          ...(data.name ? { header: data.name } : {}),
        },
        create: {
          id: "default",
          logo: data.logo,
          header: data.name || "BL Dignostic LIMS Reference Laboratory",
        },
      });
    }

    res.json({ data: lab });
  } catch (error) {
    next(error);
  }
};

// Report Settings
export const getReportSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let report = await prisma.reportSetting.findUnique({ where: { id: "default" } });
    if (!report) {
      report = await prisma.reportSetting.create({ data: { id: "default" } });
    }
    res.json({ data: report });
  } catch (error) {
    next(error);
  }
};

export const updateReportSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const report = await prisma.reportSetting.upsert({
      where: { id: "default" },
      update: {
        header: data.header,
        logo: data.logo,
        footer: data.footer,
        signature: data.signature,
        reportNumberingPrefix: data.reportNumberingPrefix,
        reportNumberingNext: data.reportNumberingNext !== undefined ? Number(data.reportNumberingNext) : undefined,
        dateFormat: data.dateFormat,
        showLogo: data.showLogo !== undefined ? Boolean(data.showLogo) : undefined,
        showSignatory: data.showSignatory !== undefined ? Boolean(data.showSignatory) : undefined,
        autoApprovePathologist: data.autoApprovePathologist !== undefined ? Boolean(data.autoApprovePathologist) : undefined,
      },
      create: { id: "default", ...data },
    });
    res.json({ data: report });
  } catch (error) {
    next(error);
  }
};

// Reference Ranges
export const listReferenceRanges = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ranges = await prisma.referenceRange.findMany({
      orderBy: { testCode: "asc" },
    });
    res.json({ data: ranges });
  } catch (error) {
    next(error);
  }
};

export const createReferenceRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const created = await prisma.referenceRange.create({
      data: {
        testCode: data.testCode,
        testName: data.testName,
        parameter: data.parameter,
        gender: data.gender || "Both",
        ageMin: data.ageMin !== undefined ? Number(data.ageMin) : null,
        ageMax: data.ageMax !== undefined ? Number(data.ageMax) : null,
        minimum: Number(data.minimum) || 0,
        maximum: Number(data.maximum) || 0,
        unit: data.unit,
        criticalLow: data.criticalLow !== undefined ? Number(data.criticalLow) : null,
        criticalHigh: data.criticalHigh !== undefined ? Number(data.criticalHigh) : null,
      },
    });
    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const updateReferenceRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.referenceRange.update({
      where: { id },
      data: {
        testCode: data.testCode,
        testName: data.testName,
        parameter: data.parameter,
        gender: data.gender,
        ageMin: data.ageMin !== undefined ? Number(data.ageMin) : undefined,
        ageMax: data.ageMax !== undefined ? Number(data.ageMax) : undefined,
        minimum: data.minimum !== undefined ? Number(data.minimum) : undefined,
        maximum: data.maximum !== undefined ? Number(data.maximum) : undefined,
        unit: data.unit,
        criticalLow: data.criticalLow !== undefined ? Number(data.criticalLow) : undefined,
        criticalHigh: data.criticalHigh !== undefined ? Number(data.criticalHigh) : undefined,
      },
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteReferenceRange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.referenceRange.delete({ where: { id } });
    res.json({ message: "Reference range deleted" });
  } catch (error) {
    next(error);
  }
};

// Units
export const listUnits = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const units = await prisma.unitDefinition.findMany({
      orderBy: { code: "asc" },
    });
    res.json({ data: units });
  } catch (error) {
    next(error);
  }
};

export const createUnit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const created = await prisma.unitDefinition.create({
      data: {
        code: data.code,
        name: data.name,
        category: data.category || "General",
        baseUnit: data.baseUnit || null,
        conversionFactor: data.conversionFactor !== undefined ? Number(data.conversionFactor) : null,
      },
    });
    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const updateUnit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.unitDefinition.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        category: data.category,
        baseUnit: data.baseUnit,
        conversionFactor: data.conversionFactor !== undefined ? Number(data.conversionFactor) : undefined,
      },
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteUnit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.unitDefinition.delete({ where: { id } });
    res.json({ message: "Unit deleted" });
  } catch (error) {
    next(error);
  }
};

// Notifications
export const getNotifications = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let notif = await prisma.notificationSetting.findUnique({ where: { id: "default" } });
    if (!notif) {
      notif = await prisma.notificationSetting.create({ data: { id: "default" } });
    }
    res.json({ data: notif });
  } catch (error) {
    next(error);
  }
};

export const updateNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const notif = await prisma.notificationSetting.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    res.json({ data: notif });
  } catch (error) {
    next(error);
  }
};

// System
export const getSystem = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let system = await prisma.systemPreference.findUnique({ where: { id: "default" } });
    if (!system) {
      system = await prisma.systemPreference.create({ data: { id: "default" } });
    }
    res.json({ data: system });
  } catch (error) {
    next(error);
  }
};

export const updateSystem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const system = await prisma.systemPreference.upsert({
      where: { id: "default" },
      update: {
        timezone: data.timezone,
        dateFormat: data.dateFormat,
        timeFormat: data.timeFormat,
        language: data.language,
        theme: data.theme,
        defaultLandingPage: data.defaultLandingPage,
        resultsPerPage: data.resultsPerPage !== undefined ? Number(data.resultsPerPage) : undefined,
      },
      create: { id: "default", ...data },
    });
    res.json({ data: system });
  } catch (error) {
    next(error);
  }
};
