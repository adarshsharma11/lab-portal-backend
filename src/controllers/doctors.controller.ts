import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const doctors = await prisma.doctor.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { specialty: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: doctors });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { patients: true, appointments: true, reports: true },
    });
    if (!doctor) {
      res.status(404).json({ message: "Doctor not found" });
      return;
    }
    res.json({ data: doctor });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Doctor name is required" });
      return;
    }
    if (!data.phone || typeof data.phone !== "string" || !data.phone.trim()) {
      res.status(400).json({ message: "Doctor phone number is required" });
      return;
    }

    const created = await prisma.doctor.create({
      data: {
        name: data.name.trim(),
        specialty: data.specialty || "General Medicine",
        phone: data.phone || "",
        email: data.email || null,
        city: data.city || null,
        gender: data.gender || null,
        experience: data.experience || null,
        description: data.description || null,
        dateOfJoining: data.dateOfJoining || null,
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
    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        name: data.name,
        specialty: data.specialty,
        phone: data.phone,
        email: data.email,
        city: data.city,
        gender: data.gender,
        experience: data.experience,
        description: data.description,
        dateOfJoining: data.dateOfJoining,
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
    await prisma.doctor.delete({ where: { id } });
    res.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    next(error);
  }
};
