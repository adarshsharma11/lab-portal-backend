import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest, getTenantScope } from "../middleware/auth.middleware";

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    if (isFranchise && !userFranchiseId) {
      res.json({ data: [] });
      return;
    }

    let whereClause: any = {};
    if (isFranchise) {
      whereClause = { franchiseId: userFranchiseId };
    } else if (effectiveFranchiseId) {
      whereClause = { franchiseId: effectiveFranchiseId };
    }

    if (search) {
      whereClause = {
        AND: [
          whereClause,
          {
            OR: [
              { patient: { name: { contains: search, mode: "insensitive" } } },
              { doctor: { name: { contains: search, mode: "insensitive" } } },
              { type: { contains: search, mode: "insensitive" } },
            ],
          },
        ],
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
        franchise: { select: { id: true, name: true, code: true } },
      },
      orderBy: { date: "desc" },
    });
    res.json({ data: appointments });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { 
        patient: true, 
        doctor: true,
        franchise: true,
      },
    });
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }

    if (isFranchise && appointment.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Appointment belongs to another franchise." });
      return;
    }

    res.json({ data: appointment });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const { isFranchise, userFranchiseId } = getTenantScope(req);
    let patient = null;

    if (data.patientId && typeof data.patientId === "string" && data.patientId.trim()) {
      const pid = data.patientId.trim();
      patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { id: pid },
            { patientCode: { equals: pid, mode: "insensitive" } },
            { name: { contains: pid, mode: "insensitive" } },
          ],
          ...(isFranchise && userFranchiseId ? { franchiseId: userFranchiseId } : {}),
        },
      });
    }

    if (!patient) {
      patient = await prisma.patient.findFirst({
        where: isFranchise && userFranchiseId ? { franchiseId: userFranchiseId } : undefined,
      });
    }

    if (!patient) {
      res.status(400).json({ message: "No registered patient found. Please register a patient first." });
      return;
    }

    let doctor = null;
    if (data.doctorId && typeof data.doctorId === "string" && data.doctorId.trim()) {
      const did = data.doctorId.trim();
      doctor = await prisma.doctor.findFirst({
        where: {
          OR: [
            { id: did },
            { name: { contains: did, mode: "insensitive" } },
          ],
        },
      });
    }

    if (!doctor) {
      doctor = await prisma.doctor.findFirst();
    }

    if (!doctor) {
      res.status(400).json({ message: "No registered doctor found. Please add a doctor first." });
      return;
    }

    const franchiseId = isFranchise
      ? userFranchiseId
      : (data.franchiseId || patient.franchiseId || null);

    const created = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        franchiseId,
        date: data.date || new Date().toISOString().slice(0, 10),
        time: data.time || "10:00",
        type: data.type || "Consultation",
        status: data.status || "Upcoming",
        appointmentLink: data.appointmentLink || null,
        createdBy: data.createdBy || "Dr. Ananya Rao",
      },
      include: {
        patient: true,
        doctor: true,
        franchise: true,
      },
    });

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot update appointment belonging to another franchise." });
      return;
    }

    let patientIdUpdate: string | undefined = undefined;
    if (data.patientId && typeof data.patientId === "string" && data.patientId.trim()) {
      const pid = data.patientId.trim();
      const patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { id: pid },
            { patientCode: { equals: pid, mode: "insensitive" } },
            { name: { contains: pid, mode: "insensitive" } },
          ],
        },
      });
      if (patient) patientIdUpdate = patient.id;
    }

    let doctorIdUpdate: string | undefined = undefined;
    if (data.doctorId && typeof data.doctorId === "string" && data.doctorId.trim()) {
      const did = data.doctorId.trim();
      const doctor = await prisma.doctor.findFirst({
        where: {
          OR: [
            { id: did },
            { name: { contains: did, mode: "insensitive" } },
          ],
        },
      });
      if (doctor) doctorIdUpdate = doctor.id;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        patientId: patientIdUpdate,
        doctorId: doctorIdUpdate,
        franchiseId: isFranchise ? undefined : (data.franchiseId !== undefined ? data.franchiseId : undefined),
        date: data.date,
        time: data.time,
        type: data.type,
        status: data.status,
        appointmentLink: data.appointmentLink,
        createdBy: data.createdBy,
      },
      include: {
        patient: true,
        doctor: true,
        franchise: true,
      },
    });
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot delete appointment belonging to another franchise." });
      return;
    }

    await prisma.appointment.delete({ where: { id } });
    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
