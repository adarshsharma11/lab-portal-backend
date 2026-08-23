import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const status = typeof req.query.status === "string" && req.query.status !== "All" ? req.query.status : undefined;
    const department = typeof req.query.department === "string" && req.query.department !== "All" ? req.query.department : undefined;

    const instruments = await prisma.instrument.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { manufacturer: { contains: search, mode: "insensitive" } },
                  { model: { contains: search, mode: "insensitive" } },
                  { serialNumber: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          status ? { status } : {},
          department ? { department } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: instruments });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const instrument = await prisma.instrument.findUnique({ where: { id } });
    if (!instrument) {
      res.status(404).json({ message: "Instrument not found" });
      return;
    }
    res.json({ data: instrument });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const count = await prisma.instrument.count();
    const id = data.id || `Ins-${(count + 1).toString().padStart(3, "0")}`;

    const created = await prisma.instrument.create({
      data: {
        id,
        name: data.name,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber || `SN-${Date.now()}`,
        department: data.department || "Hematology",
        instrumentType: data.instrumentType || "Hematology Analyzer",
        status: data.status || "Online",
        installationDate: data.installationDate || new Date().toISOString().slice(0, 10),
        lastMaintenance: data.lastMaintenance || null,
        nextMaintenance: data.nextMaintenance || null,
        connectionStatus: data.connectionStatus || "Connected",
        lastCommunication: data.lastCommunication || new Date().toISOString(),
        ipAddress: data.ipAddress || null,
        location: data.location || null,
        description: data.description || null,
      },
    });

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.instrument.update({
      where: { id },
      data: {
        name: data.name,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        department: data.department,
        instrumentType: data.instrumentType,
        status: data.status,
        installationDate: data.installationDate,
        lastMaintenance: data.lastMaintenance,
        nextMaintenance: data.nextMaintenance,
        connectionStatus: data.connectionStatus,
        lastCommunication: data.lastCommunication,
        ipAddress: data.ipAddress,
        location: data.location,
        description: data.description,
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
    await prisma.instrument.delete({ where: { id } });
    res.json({ message: "Instrument deleted successfully" });
  } catch (error) {
    next(error);
  }
};
