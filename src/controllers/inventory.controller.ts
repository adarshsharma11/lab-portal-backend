import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: items });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ message: "Inventory item not found" });
      return;
    }
    res.json({ data: item });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    if (!data.medicine || typeof data.medicine !== "string" || !data.medicine.trim()) {
      res.status(400).json({ message: "Item or consumable name is required" });
      return;
    }

    const created = await prisma.inventoryItem.create({
      data: {
        medicine: data.medicine.trim(),
        stockQuantity: Number(data.stockQuantity) || 0,
        purchasePrice: Number(data.purchasePrice) || 0,
        salePrice: Number(data.salePrice) || 0,
        stockHolder: data.stockHolder || "Central Store",
        batchNumber: data.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
        expiryDate: data.expiryDate || "2027-01-01",
        reorderLevel: Number(data.reorderLevel) || 20,
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
    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        medicine: data.medicine,
        stockQuantity: data.stockQuantity !== undefined ? Number(data.stockQuantity) : undefined,
        purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
        salePrice: data.salePrice !== undefined ? Number(data.salePrice) : undefined,
        stockHolder: data.stockHolder,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate,
        reorderLevel: data.reorderLevel !== undefined ? Number(data.reorderLevel) : undefined,
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
    await prisma.inventoryItem.delete({ where: { id } });
    res.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    next(error);
  }
};
