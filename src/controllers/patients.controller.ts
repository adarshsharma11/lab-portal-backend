import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const patients = await prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { patientCode: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: patients });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        samples: true,
        reports: true,
        appointments: true,
        invoices: true,
      },
    });
    if (!patient) {
      res.status(404).json({ message: "Patient not found" });
      return;
    }
    res.json({ data: patient });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Patient name is required" });
      return;
    }
    if (!data.phone || typeof data.phone !== "string" || !data.phone.trim()) {
      res.status(400).json({ message: "Patient phone number is required" });
      return;
    }

    const patientCode = data.patientCode && data.patientCode !== "PT-"
      ? data.patientCode
      : `PT-${Math.floor(10000 + Math.random() * 90000)}`;

    const created = await prisma.patient.create({
      data: {
        patientCode,
        name: data.name.trim(),
        age: Number(data.age) || 30,
        sex: data.sex || "Female",
        phone: data.phone || "",
        email: data.email || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        address: data.address || null,
        emergencyContact: data.emergencyContact || null,
        bloodGroup: data.bloodGroup || null,
        referringDoctorId: data.referringDoctorId || null,
        status: data.status || "Active",
        dateOfBirth: data.dateOfBirth || null,
      },
    });

    // Add audit log
    await prisma.auditActivity.create({
      data: {
        type: "Patient registered",
        subject: created.name,
        detail: `${created.patientCode} registered`,
        time: "Just now",
      },
    }).catch(() => {});

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        name: data.name,
        age: data.age !== undefined ? Number(data.age) : undefined,
        sex: data.sex,
        phone: data.phone,
        email: data.email,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        address: data.address,
        emergencyContact: data.emergencyContact,
        bloodGroup: data.bloodGroup,
        referringDoctorId: data.referringDoctorId,
        status: data.status,
        dateOfBirth: data.dateOfBirth,
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
    await prisma.patient.delete({ where: { id } });
    res.json({ message: "Patient deleted successfully" });
  } catch (error) {
    next(error);
  }
};
