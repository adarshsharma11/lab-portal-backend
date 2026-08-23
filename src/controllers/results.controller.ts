import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const results = await prisma.result.findMany({
      include: {
        test: {
          select: { id: true, name: true, code: true, department: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await prisma.result.findUnique({
      where: { id },
      include: { test: true },
    });
    if (!result) {
      res.status(404).json({ message: "Result not found" });
      return;
    }
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    let testId = data.testId;

    if (!testId) {
      const firstTest = await prisma.test.findFirst();
      if (firstTest) testId = firstTest.id;
    }

    const created = await prisma.result.create({
      data: {
        testId,
        parameter: data.parameter,
        value: String(data.value),
        unit: data.unit || "",
        referenceRange: data.referenceRange || "",
        abnormalFlag: Boolean(data.abnormalFlag),
        criticalFlag: Boolean(data.criticalFlag),
        comments: data.comments || null,
      },
    });

    if (created.criticalFlag) {
      await prisma.auditActivity.create({
        data: {
          type: "Critical result",
          subject: created.parameter,
          detail: `${created.parameter} ${created.value} ${created.unit} flagged`,
          time: "Just now",
        },
      }).catch(() => {});
    }

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.result.update({
      where: { id },
      data: {
        parameter: data.parameter,
        value: data.value !== undefined ? String(data.value) : undefined,
        unit: data.unit,
        referenceRange: data.referenceRange,
        abnormalFlag: data.abnormalFlag !== undefined ? Boolean(data.abnormalFlag) : undefined,
        criticalFlag: data.criticalFlag !== undefined ? Boolean(data.criticalFlag) : undefined,
        comments: data.comments,
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
    await prisma.result.delete({ where: { id } });
    res.json({ message: "Result deleted successfully" });
  } catch (error) {
    next(error);
  }
};
