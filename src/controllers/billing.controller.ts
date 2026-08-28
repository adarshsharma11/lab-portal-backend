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
              { billNumber: { contains: search, mode: "insensitive" } },
              { patient: { name: { contains: search, mode: "insensitive" } } },
            ],
          },
        ],
      };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, patientCode: true } },
        doctor: { select: { id: true, name: true } },
        franchise: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: invoices });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { 
        patient: true, 
        doctor: true,
        franchise: true,
      },
    });
    if (!invoice) {
      res.status(404).json({ message: "Invoice not found" });
      return;
    }

    if (isFranchise && invoice.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Invoice belongs to another franchise." });
      return;
    }

    res.json({ data: invoice });
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
        franchiseId,
        billDate: data.billDate || new Date().toISOString().slice(0, 10),
        items,
        discount,
        sgst,
        cgst,
        total,
        paymentStatus: data.paymentStatus || "Pending",
        addedBy: data.addedBy || "Dr. Ananya Rao",
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

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Invoice not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot update invoice belonging to another franchise." });
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

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        billNumber: data.billNumber,
        patientId: patientIdUpdate,
        doctorId: doctorIdUpdate,
        franchiseId: isFranchise ? undefined : (data.franchiseId !== undefined ? data.franchiseId : undefined),
        billDate: data.billDate,
        items: data.items,
        discount: data.discount !== undefined ? Number(data.discount) : undefined,
        sgst: data.sgst !== undefined ? Number(data.sgst) : undefined,
        cgst: data.cgst !== undefined ? Number(data.cgst) : undefined,
        total: data.total !== undefined ? Number(data.total) : undefined,
        paymentStatus: data.paymentStatus,
        addedBy: data.addedBy,
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

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Invoice not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot delete invoice belonging to another franchise." });
      return;
    }

    await prisma.invoice.delete({ where: { id } });
    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    next(error);
  }
};
