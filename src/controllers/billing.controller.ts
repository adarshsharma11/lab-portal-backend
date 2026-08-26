import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        patient: { select: { id: true, name: true, patientCode: true } },
        doctor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: invoices });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { patient: true, doctor: true },
    });
    if (!invoice) {
      res.status(404).json({ message: "Invoice not found" });
      return;
    }
    res.json({ data: invoice });
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

    const billNumber = data.billNumber && data.billNumber.trim()
      ? data.billNumber.trim()
      : `INV-${Date.now().toString().slice(-6)}`;

    let items = data.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      if (data.itemDescription) {
        items = [
          {
            description: data.itemDescription,
            quantity: Number(data.itemQuantity) || 1,
            mrp: Number(data.itemMrp) || Number(data.total) || 450,
          },
        ];
      } else {
        items = [{ description: "Diagnostic Pathology Services", quantity: 1, mrp: Number(data.total) || 450 }];
      }
    }

    const discount = Number(data.discount) || 0;
    const sgst = Number(data.sgst) || 0;
    const cgst = Number(data.cgst) || 0;
    const total = Number(data.total) || 450;

    const created = await prisma.invoice.create({
      data: {
        billNumber,
        patientId: patient.id,
        doctorId: doctor.id,
        billDate: data.billDate || new Date().toISOString().slice(0, 10),
        items,
        discount,
        sgst,
        cgst,
        total,
        paymentStatus: data.paymentStatus || "Pending",
        addedBy: data.addedBy || "Dr. Ananya Rao",
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

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        billNumber: data.billNumber,
        patientId: patientIdUpdate,
        doctorId: doctorIdUpdate,
        billDate: data.billDate,
        items: data.items,
        discount: data.discount !== undefined ? Number(data.discount) : undefined,
        sgst: data.sgst !== undefined ? Number(data.sgst) : undefined,
        cgst: data.cgst !== undefined ? Number(data.cgst) : undefined,
        total: data.total !== undefined ? Number(data.total) : undefined,
        paymentStatus: data.paymentStatus,
        addedBy: data.addedBy,
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
    await prisma.invoice.delete({ where: { id } });
    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    next(error);
  }
};
