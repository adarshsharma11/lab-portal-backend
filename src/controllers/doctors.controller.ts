import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/auth";
import { AuthenticatedRequest, getTenantScope } from "../middleware/auth.middleware";

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    let whereClause: any = {};
    if (isFranchise) {
      if (!userFranchiseId) {
        res.json({ data: [] });
        return;
      }
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
              { name: { contains: search, mode: "insensitive" } },
              { specialty: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        ],
      };
    }

    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        franchise: { select: { id: true, name: true, code: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: doctors });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { 
        franchise: { select: { id: true, name: true, code: true, city: true } },
        patients: true, 
        appointments: true, 
        reports: true 
      },
    });
    if (!doctor) {
      res.status(404).json({ message: "Doctor not found" });
      return;
    }

    if (isFranchise && doctor.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Doctor belongs to another franchise." });
      return;
    }

    res.json({ data: doctor });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Doctor name is required" });
      return;
    }

    let franchiseId: string;
    if (isFranchise) {
      if (!userFranchiseId) {
        res.status(403).json({ message: "User is not assigned to any franchise." });
        return;
      }
      franchiseId = userFranchiseId;
    } else {
      if (!data.franchiseId || typeof data.franchiseId !== "string" || !data.franchiseId.trim()) {
        res.status(400).json({ message: "Franchise selection is required for this doctor." });
        return;
      }
      franchiseId = data.franchiseId.trim();
    }

    const created = await prisma.doctor.create({
      data: {
        name: data.name.trim(),
        specialty: data.specialty && typeof data.specialty === "string" && data.specialty.trim() ? data.specialty.trim() : null,
        phone: data.phone && typeof data.phone === "string" ? data.phone.trim() : "",
        email: data.email && typeof data.email === "string" && data.email.trim() ? data.email.toLowerCase().trim() : null,
        city: data.city || null,
        gender: data.gender || null,
        experience: data.experience || null,
        description: data.description || null,
        dateOfJoining: data.dateOfJoining || null,
        franchiseId,
      },
      include: {
        franchise: true,
      },
    });

    // If email is provided, create/update User login account with credentials
    if (data.email && typeof data.email === "string" && data.email.trim()) {
      const email = data.email.toLowerCase().trim();
      const password = data.password || "Doctor@123";
      const passwordHash = await hashPassword(password);
      const initials = data.name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            name: data.name.trim(),
            email,
            passwordHash,
            role: "Doctor",
            initials,
            active: true,
            permissions: ["patients:read", "reports:read", "appointments:read", "billing:read"],
            mobile: data.phone || null,
            gender: data.gender || null,
            location: data.city || null,
            franchiseId,
          },
        });
      } else {
        await prisma.user.update({
          where: { email },
          data: {
            name: data.name.trim(),
            role: "Doctor",
            mobile: data.phone || undefined,
            gender: data.gender || undefined,
            location: data.city || undefined,
            franchiseId,
            passwordHash: data.password ? passwordHash : undefined,
          },
        });
      }
    }

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

    const existing = await prisma.doctor.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "Doctor not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot update doctor belonging to another franchise." });
      return;
    }

    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        specialty: data.specialty !== undefined ? (data.specialty && typeof data.specialty === "string" && data.specialty.trim() ? data.specialty.trim() : null) : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        email: data.email ? data.email.toLowerCase().trim() : undefined,
        city: data.city,
        gender: data.gender,
        experience: data.experience,
        description: data.description,
        dateOfJoining: data.dateOfJoining,
        franchiseId: isFranchise ? undefined : (data.franchiseId !== undefined ? data.franchiseId : undefined),
      },
      include: {
        franchise: true,
      },
    });

    if (data.email) {
      const email = data.email.toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({ where: { email } });
      let passwordHash: string | undefined = undefined;
      if (data.password) {
        passwordHash = await hashPassword(data.password);
      }
      if (existingUser) {
        await prisma.user.update({
          where: { email },
          data: {
            name: data.name,
            mobile: data.phone,
            location: data.city,
            gender: data.gender,
            passwordHash: passwordHash || undefined,
          },
        });
      } else if (data.password) {
        const initials = (data.name || "Doctor")
          .split(" ")
          .map((n: string) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        await prisma.user.create({
          data: {
            name: data.name || "Doctor",
            email,
            passwordHash: passwordHash || (await hashPassword("Doctor@123")),
            role: "Doctor",
            initials,
            active: true,
            permissions: ["patients:read", "reports:read", "appointments:read", "billing:read"],
            mobile: data.phone || null,
            gender: data.gender || null,
            location: data.city || null,
            franchiseId: existing.franchiseId,
          },
        });
      }
    }

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) {
      res.status(404).json({ message: "Doctor not found" });
      return;
    }

    if (isFranchise && doctor.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot delete doctor belonging to another franchise." });
      return;
    }

    if (doctor?.email) {
      await prisma.user.deleteMany({ where: { email: doctor.email } }).catch(() => {});
    }
    await prisma.doctor.delete({ where: { id } });
    res.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getDoctorLedger = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate.trim() : undefined;
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate.trim() : undefined;

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        franchise: { select: { id: true, name: true, code: true, city: true } },
      },
    });

    if (!doctor) {
      res.status(404).json({ message: "Doctor not found" });
      return;
    }

    if (isFranchise && doctor.franchiseId && userFranchiseId && doctor.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Doctor belongs to another franchise." });
      return;
    }

    // Build date filters
    const dateConditions: any[] = [];
    if (startDate && endDate) {
      const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
      const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
      dateConditions.push({
        OR: [
          { createdAt: { gte: startDateTime, lte: endDateTime } },
          { billDate: { gte: startDate, lte: endDate } },
        ],
      });
    } else if (startDate) {
      const startDateTime = new Date(`${startDate}T00:00:00.000Z`);
      dateConditions.push({
        OR: [
          { createdAt: { gte: startDateTime } },
          { billDate: { gte: startDate } },
        ],
      });
    } else if (endDate) {
      const endDateTime = new Date(`${endDate}T23:59:59.999Z`);
      dateConditions.push({
        OR: [
          { createdAt: { lte: endDateTime } },
          { billDate: { lte: endDate } },
        ],
      });
    }

    const andConditions: any[] = [{ doctorId: id }];
    if (isFranchise && userFranchiseId) {
      andConditions.push({ franchiseId: userFranchiseId });
    }
    if (dateConditions.length > 0) {
      andConditions.push(...dateConditions);
    }

    const whereClause: any = { AND: andConditions };

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        patient: { select: { id: true, name: true, patientCode: true, phone: true, age: true, sex: true } },
        franchise: { select: { id: true, name: true, code: true, city: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalBusiness = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const totalPaid = invoices.filter((inv) => inv.paymentStatus === "Paid").reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const totalPending = totalBusiness - totalPaid;
    const totalDiscount = invoices.reduce((sum, inv) => sum + (Number(inv.discount) || 0), 0);
    const totalInvoices = invoices.length;
    const uniquePatientIds = new Set(invoices.map((inv) => inv.patientId).filter(Boolean));
    const totalPatients = uniquePatientIds.size;
    const averageInvoiceValue = totalInvoices > 0 ? Math.round((totalBusiness / totalInvoices) * 100) / 100 : 0;

    // Group date-wise
    const dateMap: Record<string, { date: string; totalBusiness: number; totalPaid: number; totalPending: number; invoiceCount: number; patients: Set<string> }> = {};
    invoices.forEach((inv) => {
      const dateStr = inv.billDate || (inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 10) : "N/A");
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = {
          date: dateStr,
          totalBusiness: 0,
          totalPaid: 0,
          totalPending: 0,
          invoiceCount: 0,
          patients: new Set(),
        };
      }
      const amount = Number(inv.total) || 0;
      dateMap[dateStr].totalBusiness += amount;
      if (inv.paymentStatus === "Paid") {
        dateMap[dateStr].totalPaid += amount;
      } else {
        dateMap[dateStr].totalPending += amount;
      }
      dateMap[dateStr].invoiceCount += 1;
      if (inv.patientId) dateMap[dateStr].patients.add(inv.patientId);
    });

    const dateWiseBreakdown = Object.values(dateMap)
      .map((d) => ({
        date: d.date,
        totalBusiness: Math.round(d.totalBusiness * 100) / 100,
        totalPaid: Math.round(d.totalPaid * 100) / 100,
        totalPending: Math.round(d.totalPending * 100) / 100,
        invoiceCount: d.invoiceCount,
        uniquePatients: d.patients.size,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Formatted invoice list
    const invoiceList = invoices.map((inv) => {
      let itemDescriptions = "Pathology Diagnostic Services";
      if (Array.isArray(inv.items) && inv.items.length > 0) {
        itemDescriptions = (inv.items as any[])
          .map((it) => it.description || it.name || "Diagnostic Service")
          .join(", ");
      }
      return {
        id: inv.id,
        billNumber: inv.billNumber,
        billDate: inv.billDate || (inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 10) : ""),
        createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : "",
        patientId: inv.patientId,
        patientName: inv.patient?.name || "Unknown Patient",
        patientCode: inv.patient?.patientCode || "—",
        patientPhone: inv.patient?.phone || "—",
        itemsSummary: itemDescriptions,
        items: inv.items,
        total: Number(inv.total) || 0,
        discount: Number(inv.discount) || 0,
        paymentStatus: inv.paymentStatus,
        franchiseId: inv.franchiseId,
        franchiseName: inv.franchise?.name || "Main Lab",
        franchiseCode: inv.franchise?.code || "",
      };
    });

    res.json({
      data: {
        doctor: {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          phone: doctor.phone,
          email: doctor.email,
          city: doctor.city,
          gender: doctor.gender,
          experience: doctor.experience,
          dateOfJoining: doctor.dateOfJoining,
          franchiseId: doctor.franchiseId,
          franchiseName: doctor.franchise?.name || "All / Central Lab",
          franchiseCode: doctor.franchise?.code || "",
        },
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        summary: {
          totalBusiness: Math.round(totalBusiness * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          totalPending: Math.round(totalPending * 100) / 100,
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          totalInvoices,
          totalPatients,
          averageInvoiceValue,
        },
        dateWiseBreakdown,
        invoices: invoiceList,
      },
    });
  } catch (error) {
    next(error);
  }
};
