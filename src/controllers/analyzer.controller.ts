import { Request, Response, NextFunction } from "express";
import type { Instrument, AnalyzerResult, AnalyzerOrder } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const instrumentId = typeof req.query.instrumentId === "string" ? req.query.instrumentId : undefined;

    const instruments = await prisma.instrument.findMany({
      where: instrumentId ? { id: instrumentId } : undefined,
    });

    const results = await prisma.analyzerResult.findMany();
    const orders = await prisma.analyzerOrder.findMany();

    const statusList = instruments.map((inst: Instrument) => {
      const isConnected = inst.connectionStatus === "Connected";
      const pendingResults = results.filter((r: AnalyzerResult) => r.instrumentId === inst.id && r.status === "Received").length;
      const pendingOrders = orders.filter((o: AnalyzerOrder) => o.instrumentId === inst.id && (o.status === "Pending" || o.status === "Sent")).length;

      return {
        instrumentId: inst.id,
        connected: isConnected,
        lastSync: isConnected ? (inst.lastCommunication || new Date().toISOString()) : undefined,
        pendingResults,
        pendingOrders,
      };
    });

    res.json({ data: statusList });
  } catch (error) {
    next(error);
  }
};

export const listResults = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const results = await prisma.analyzerResult.findMany({
      orderBy: { receivedAt: "desc" },
    });
    res.json({ data: results });
  } catch (error) {
    next(error);
  }
};

export const listOrders = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orders = await prisma.analyzerOrder.findMany({
      orderBy: { sentAt: "desc" },
    });
    res.json({ data: orders });
  } catch (error) {
    next(error);
  }
};

export const listErrors = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = await prisma.analyzerIntegrationError.findMany({
      orderBy: { timestamp: "desc" },
    });
    res.json({ data: errors });
  } catch (error) {
    next(error);
  }
};

export const acknowledgeError = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.analyzerIntegrationError.update({
      where: { id },
      data: { acknowledged: true },
    });
    res.json({ data: true, message: "Error acknowledged" });
  } catch (error) {
    next(error);
  }
};
