import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { select: { id: true, name: true, specialty: true } },
      },
      orderBy: { date: "desc" },
    });
    res.json({ data: appointments });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, doctor: true },
    });
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    res.json({ data: appointment });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
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
        },
      });
    }

    if (!patient) {
      patient = await prisma.patient.findFirst();
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

    const created = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        date: data.date || new Date().toISOString().slice(0, 10),
        time: data.time || "10:00",
        type: data.type || "Consultation",
        status: data.status || "Upcoming",
        appointmentLink: data.appointmentLink || null,
        createdBy: data.createdBy || "Dr. Ananya Rao",
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
        date: data.date,
        time: data.time,
        type: data.type,
        status: data.status,
        appointmentLink: data.appointmentLink,
        createdBy: data.createdBy,
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
    await prisma.appointment.delete({ where: { id } });
    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
