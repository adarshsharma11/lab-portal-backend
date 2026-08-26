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
      include: {
        referringDoctor: { select: { id: true, name: true } },
      },
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
        referringDoctor: true,
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

    const patientCode = data.patientCode && data.patientCode !== "PT-" && data.patientCode.trim()
      ? data.patientCode.trim()
      : `PT-${Math.floor(10000 + Math.random() * 90000)}`;

    let referringDoctorId: string | null = null;
    if (data.referringDoctorId && typeof data.referringDoctorId === "string" && data.referringDoctorId.trim()) {
      const doc = await prisma.doctor.findFirst({
        where: {
          OR: [
            { id: data.referringDoctorId.trim() },
            { name: { contains: data.referringDoctorId.trim(), mode: "insensitive" } },
          ],
        },
      });
      if (doc) {
        referringDoctorId = doc.id;
      }
    }

    const created = await prisma.patient.create({
      data: {
        patientCode,
        name: data.name.trim(),
        age: Number(data.age) || 30,
        sex: data.sex || "Female",
        phone: data.phone.trim(),
        email: data.email ? data.email.trim() : null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        address: data.address || null,
        emergencyContact: data.emergencyContact || null,
        bloodGroup: data.bloodGroup || null,
        referringDoctorId,
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

    let referringDoctorIdUpdate: string | null | undefined = undefined;
    if (data.referringDoctorId !== undefined) {
      if (!data.referringDoctorId || (typeof data.referringDoctorId === "string" && !data.referringDoctorId.trim())) {
        referringDoctorIdUpdate = null;
      } else {
        const doc = await prisma.doctor.findFirst({
          where: {
            OR: [
              { id: String(data.referringDoctorId).trim() },
              { name: { contains: String(data.referringDoctorId).trim(), mode: "insensitive" } },
            ],
          },
        });
        referringDoctorIdUpdate = doc ? doc.id : null;
      }
    }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        age: data.age !== undefined ? Number(data.age) : undefined,
        sex: data.sex,
        phone: data.phone ? data.phone.trim() : undefined,
        email: data.email !== undefined ? (data.email ? data.email.trim() : null) : undefined,
        city: data.city !== undefined ? data.city : undefined,
        state: data.state !== undefined ? data.state : undefined,
        pincode: data.pincode !== undefined ? data.pincode : undefined,
        address: data.address !== undefined ? data.address : undefined,
        emergencyContact: data.emergencyContact !== undefined ? data.emergencyContact : undefined,
        bloodGroup: data.bloodGroup !== undefined ? data.bloodGroup : undefined,
        referringDoctorId: referringDoctorIdUpdate,
        status: data.status !== undefined ? data.status : undefined,
        dateOfBirth: data.dateOfBirth !== undefined ? data.dateOfBirth : undefined,
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
