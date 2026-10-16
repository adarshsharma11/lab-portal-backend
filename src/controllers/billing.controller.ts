import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest, getTenantScope, getUserIdentifier } from "../middleware/auth.middleware";

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

    const sanitizedInvoices = invoices.map((inv) => {
      let parsedItems: any[] = [];
      if (Array.isArray(inv.items)) {
        parsedItems = inv.items;
      } else if (typeof inv.items === "string") {
        try { parsedItems = JSON.parse(inv.items); } catch { parsedItems = []; }
      }
      if (parsedItems.length > 0) {
        const itemSubtotal = parsedItems.reduce(
          (sum: number, it: any) => sum + (Number(it.quantity) || 1) * (Number(it.mrp) || 0),
          0
        );
        const expectedTotal = Math.max(0, itemSubtotal - (Number(inv.discount) || 0) + (Number(inv.sgst) || 0) + (Number(inv.cgst) || 0));
        return { ...inv, total: expectedTotal };
      }
      return inv;
    });

    res.json({ data: sanitizedInvoices });
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

    if (invoice.items) {
      let parsedItems: any[] = [];
      if (Array.isArray(invoice.items)) {
        parsedItems = invoice.items;
      } else if (typeof invoice.items === "string") {
        try { parsedItems = JSON.parse(invoice.items); } catch { parsedItems = []; }
      }
      if (parsedItems.length > 0) {
        const itemSubtotal = parsedItems.reduce(
          (sum: number, it: any) => sum + (Number(it.quantity) || 1) * (Number(it.mrp) || 0),
          0
        );
        const expectedTotal = Math.max(0, itemSubtotal - (Number(invoice.discount) || 0) + (Number(invoice.sgst) || 0) + (Number(invoice.cgst) || 0));
        if (invoice.total !== expectedTotal) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { total: expectedTotal },
          });
          invoice.total = expectedTotal;
        }
      }
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
    let franchiseId: string;
    if (isFranchise) {
      if (!userFranchiseId) {
        res.status(403).json({ message: "User is not assigned to any franchise." });
        return;
      }
      franchiseId = userFranchiseId;
    } else {
      if (!data.franchiseId || typeof data.franchiseId !== "string" || !data.franchiseId.trim()) {
        res.status(400).json({ message: "Franchise selection is required for this invoice." });
        return;
      }
      franchiseId = data.franchiseId.trim();
    }

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

      if (!patient) {
        res.status(400).json({ message: "Specified patient was not found." });
        return;
      }

      if (patient.franchiseId && patient.franchiseId !== franchiseId) {
        res.status(400).json({ message: "Selected patient does not belong to the selected franchise." });
        return;
      }
    } else {
      res.status(400).json({ message: "Patient selection is required for this invoice." });
      return;
    }

    let doctor = null;
    if (data.doctorId && typeof data.doctorId === "string" && data.doctorId.trim()) {
      const did = data.doctorId.trim();
      const stripped = did.replace(/^doctor\s*–\s*/i, "").replace(/^dr\.?\s*/i, "").trim();
      doctor = await prisma.doctor.findFirst({
        where: {
          OR: [
            { id: did },
            { name: { equals: did, mode: "insensitive" } },
            { name: { equals: stripped, mode: "insensitive" } },
            { name: { contains: stripped, mode: "insensitive" } },
          ],
        },
      });

      if (!doctor && did !== "None" && did !== "null" && did !== "") {
        // Auto-create referral source entity so it has a valid doctor record
        doctor = await prisma.doctor.create({
          data: {
            name: stripped || did,
            specialty: did.toLowerCase().includes("collection") 
              ? "Collection Centre" 
              : did.toLowerCase().includes("camp") 
              ? "Health Camp" 
              : did.toLowerCase().includes("direct") || did.toLowerCase().includes("walk-in") 
              ? "Self Referral" 
              : "Referral Source",
            phone: "N/A",
            franchiseId,
          },
        });
      }
    }

    if (!doctor && patient.referringDoctorId) {
      doctor = await prisma.doctor.findUnique({
        where: { id: patient.referringDoctorId },
      });
    }

    if (!doctor) {
      doctor = await prisma.doctor.findFirst({
        where: {
          OR: [
            { franchiseId },
            { franchiseId: null },
          ],
        },
      });
    }

    if (!doctor) {
      res.status(400).json({ message: "No registered doctor found. Please add a doctor first." });
      return;
    }

    const billNumber = data.billNumber && data.billNumber.trim()
      ? data.billNumber.trim()
      : `INV-${Date.now().toString().slice(-6)}`;

    // Franchise-scoped uniqueness check for billNumber
    const existingBill = await prisma.invoice.findFirst({
      where: {
        billNumber: { equals: billNumber, mode: "insensitive" },
        franchiseId,
      },
    });

    if (existingBill) {
      res.status(409).json({ message: "Bill No. already exists in this franchise." });
      return;
    }

    let items = data.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      if (data.itemDescription) {
        items = [
          {
            description: data.itemDescription,
            quantity: Number(data.itemQuantity) || 1,
            mrp: data.itemMrp !== undefined && data.itemMrp !== null && !isNaN(Number(data.itemMrp))
              ? Number(data.itemMrp)
              : (data.total !== undefined && data.total !== null && !isNaN(Number(data.total)) ? Number(data.total) : 0),
          },
        ];
      } else {
        items = [{ 
          description: "Diagnostic Pathology Services", 
          quantity: 1, 
          mrp: data.total !== undefined && data.total !== null && !isNaN(Number(data.total)) ? Number(data.total) : 0 
        }];
      }
    }

    const discount = Number(data.discount) || 0;
    const sgst = Number(data.sgst) || 0;
    const cgst = Number(data.cgst) || 0;

    const subtotal = items.reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 1) * (Number(it.mrp) || 0),
      0
    );
    const total = Math.max(0, subtotal - discount + sgst + cgst);

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
        addedBy: getUserIdentifier(req, data.addedBy || data.createdBy || "Admin"),
        createdBy: getUserIdentifier(req, data.createdBy || data.addedBy || "Admin"),
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
      const stripped = did.replace(/^doctor\s*–\s*/i, "").replace(/^dr\.?\s*/i, "").trim();
      let doctor = await prisma.doctor.findFirst({
        where: {
          OR: [
            { id: did },
            { name: { equals: did, mode: "insensitive" } },
            { name: { equals: stripped, mode: "insensitive" } },
            { name: { contains: stripped, mode: "insensitive" } },
          ],
        },
      });
      if (!doctor && did !== "None" && did !== "null" && did !== "") {
        doctor = await prisma.doctor.create({
          data: {
            name: stripped || did,
            specialty: "Referral Source",
            phone: "N/A",
            franchiseId: existing.franchiseId,
          },
        });
      }
      if (doctor) doctorIdUpdate = doctor.id;
    }

    const targetFranchiseId = isFranchise
      ? userFranchiseId
      : (data.franchiseId !== undefined ? (typeof data.franchiseId === "string" ? data.franchiseId.trim() : data.franchiseId) : existing.franchiseId);

    const targetBillNumber = data.billNumber !== undefined && typeof data.billNumber === "string"
      ? data.billNumber.trim()
      : (data.billNumber || undefined);

    if (targetBillNumber) {
      const existingBill = await prisma.invoice.findFirst({
        where: {
          id: { not: id },
          billNumber: { equals: targetBillNumber, mode: "insensitive" },
          franchiseId: targetFranchiseId,
        },
      });

      if (existingBill) {
        res.status(409).json({ message: "Bill No. already exists in this franchise." });
        return;
      }
    }

    const effectiveItems = data.items !== undefined ? data.items : existing.items;
    let parsedItems: any[] = [];
    if (Array.isArray(effectiveItems)) {
      parsedItems = effectiveItems;
    } else if (typeof effectiveItems === "string") {
      try { parsedItems = JSON.parse(effectiveItems); } catch { parsedItems = []; }
    }
    const effDiscount = data.discount !== undefined ? (Number(data.discount) || 0) : (Number(existing.discount) || 0);
    const effSgst = data.sgst !== undefined ? (Number(data.sgst) || 0) : (Number(existing.sgst) || 0);
    const effCgst = data.cgst !== undefined ? (Number(data.cgst) || 0) : (Number(existing.cgst) || 0);
    const subtotal = parsedItems.reduce(
      (sum: number, it: any) => sum + (Number(it.quantity) || 1) * (Number(it.mrp) || 0),
      0
    );
    const updatedTotal = Math.max(0, subtotal - effDiscount + effSgst + effCgst);

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        billNumber: targetBillNumber,
        patientId: patientIdUpdate,
        doctorId: doctorIdUpdate,
        franchiseId: isFranchise ? undefined : (data.franchiseId !== undefined ? data.franchiseId : undefined),
        billDate: data.billDate,
        items: data.items,
        discount: data.discount !== undefined ? Number(data.discount) : undefined,
        sgst: data.sgst !== undefined ? Number(data.sgst) : undefined,
        cgst: data.cgst !== undefined ? Number(data.cgst) : undefined,
        total: updatedTotal,
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
