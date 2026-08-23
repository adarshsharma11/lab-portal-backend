import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const suppliers = await prisma.supplier.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: suppliers });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      res.status(404).json({ message: "Supplier not found" });
      return;
    }
    res.json({ data: supplier });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Supplier company name is required" });
      return;
    }
    if (!data.phone || typeof data.phone !== "string" || !data.phone.trim()) {
      res.status(400).json({ message: "Supplier contact phone is required" });
      return;
    }

    const created = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        phone: data.phone.trim(),
        city: data.city || "",
        country: data.country || "India",
        pincode: data.pincode || "",
        address: data.address || null,
        state: data.state || null,
        description: data.description || null,
        emergencyContact: data.emergencyContact || null,
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
    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        city: data.city,
        country: data.country,
        pincode: data.pincode,
        address: data.address,
        state: data.state,
        description: data.description,
        emergencyContact: data.emergencyContact,
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
    await prisma.supplier.delete({ where: { id } });
    res.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    next(error);
  }
};
