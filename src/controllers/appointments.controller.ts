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
    let patientId = data.patientId;
    let doctorId = data.doctorId;

    if (patientId) {
      const p = await prisma.patient.findFirst({
        where: { OR: [{ id: patientId }, { patientCode: patientId }] },
      });
      if (p) patientId = p.id;
    }
    if (!patientId) {
      const p = await prisma.patient.findFirst();
      if (p) patientId = p.id;
    }

    if (doctorId) {
      const d = await prisma.doctor.findFirst({
        where: { OR: [{ id: doctorId }, { name: { contains: doctorId, mode: "insensitive" } }] },
      });
      if (d) doctorId = d.id;
    }
    if (!doctorId) {
      const d = await prisma.doctor.findFirst();
      if (d) doctorId = d.id;
    }

    const created = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
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
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
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
