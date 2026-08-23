import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: {
        patient: { select: { id: true, name: true } },
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

    const billNumber = data.billNumber || `INV-${Date.now().toString().slice(-6)}`;
    const items = data.items || [{ description: "Diagnostic Services", quantity: 1, mrp: data.total || 450 }];

    const discount = Number(data.discount) || 0;
    const sgst = Number(data.sgst) || 0;
    const cgst = Number(data.cgst) || 0;
    const total = Number(data.total) || 450;

    const created = await prisma.invoice.create({
      data: {
        billNumber,
        patientId,
        doctorId,
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
    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        billNumber: data.billNumber,
        patientId: data.patientId,
        doctorId: data.doctorId,
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
