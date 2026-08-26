import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/auth";

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";

    const franchises = await prisma.franchise.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { code: { contains: search, mode: "insensitive" } },
                  { ownerName: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { city: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          status ? { status } : {},
        ],
      },
      include: {
        _count: {
          select: {
            patients: true,
            samples: true,
            invoices: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: franchises });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const franchise = await prisma.franchise.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            mobile: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            patients: true,
            samples: true,
            reports: true,
            invoices: true,
          },
        },
      },
    });

    if (!franchise) {
      res.status(404).json({ message: "Franchise not found" });
      return;
    }

    res.json({ data: franchise });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;

    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Franchise name is required" });
      return;
    }
    if (!data.ownerName || typeof data.ownerName !== "string" || !data.ownerName.trim()) {
      res.status(400).json({ message: "Franchise owner name is required" });
      return;
    }
    if (!data.email || typeof data.email !== "string" || !data.email.trim()) {
      res.status(400).json({ message: "Franchise official email is required" });
      return;
    }
    if (!data.phone || typeof data.phone !== "string" || !data.phone.trim()) {
      res.status(400).json({ message: "Contact phone number is required" });
      return;
    }

    const email = data.email.toLowerCase().trim();
    const code = data.code && typeof data.code === "string" && data.code.trim()
      ? data.code.trim().toUpperCase()
      : `FR-${(data.city || "HUB").slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    // Check for duplicate code
    const existingCode = await prisma.franchise.findUnique({ where: { code } });
    if (existingCode) {
      res.status(409).json({ message: "A franchise with this code already exists." });
      return;
    }

    // Check for duplicate franchise email
    const existingFranchiseEmail = await prisma.franchise.findUnique({ where: { email } });
    if (existingFranchiseEmail) {
      res.status(409).json({ message: "A record with this email already exists." });
      return;
    }

    // Check for duplicate user email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ message: "A user account with this email address already exists." });
      return;
    }

    // Hash the password for the franchise login credentials
    const plainPassword = data.password && typeof data.password === "string" && data.password.trim()
      ? data.password.trim()
      : "Franchise@123";
    const passwordHash = await hashPassword(plainPassword);

    // Create the Franchise record
    const createdFranchise = await prisma.franchise.create({
      data: {
        code,
        name: data.name.trim(),
        ownerName: data.ownerName.trim(),
        email,
        phone: data.phone.trim(),
        emergencyPhone: data.emergencyPhone ? data.emergencyPhone.trim() : null,
        address: data.address ? data.address.trim() : null,
        city: data.city ? data.city.trim() : "Bangalore",
        state: data.state ? data.state.trim() : "Karnataka",
        country: data.country ? data.country.trim() : "India",
        pincode: data.pincode ? data.pincode.trim() : null,
        licenseNumber: data.licenseNumber ? data.licenseNumber.trim() : null,
        gstNumber: data.gstNumber ? data.gstNumber.trim() : null,
        revenueShare: Number(data.revenueShare) || 0,
        status: data.status || "Active",
        notes: data.notes ? data.notes.trim() : null,
      },
    });

    // Create corresponding Franchise User login account
    const initials = createdFranchise.ownerName
      .split(" ")
      .map((part: string) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    await prisma.user.create({
      data: {
        name: createdFranchise.ownerName,
        email,
        passwordHash,
        role: "Franchise",
        initials,
        active: createdFranchise.status === "Active",
        mobile: createdFranchise.phone,
        location: `${createdFranchise.name} (${createdFranchise.city})`,
        franchiseId: createdFranchise.id,
        permissions: [
          "patients:read",
          "patients:write",
          "samples:read",
          "samples:write",
          "reports:read",
          "billing:read",
          "billing:write",
          "inventory:read",
        ],
      },
    });

    // Audit log
    await prisma.auditActivity.create({
      data: {
        type: "Patient registered",
        subject: `New Franchise: ${createdFranchise.name}`,
        detail: `Code: ${createdFranchise.code} · City: ${createdFranchise.city}`,
        time: "Just now",
      },
    }).catch(() => {});

    res.status(201).json({ data: createdFranchise });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const currentFranchise = await prisma.franchise.findUnique({ where: { id } });
    if (!currentFranchise) {
      res.status(404).json({ message: "Franchise not found" });
      return;
    }

    const email = data.email ? data.email.toLowerCase().trim() : currentFranchise.email;
    const code = data.code ? data.code.toUpperCase().trim() : currentFranchise.code;

    // Check code uniqueness
    if (code !== currentFranchise.code) {
      const conflictCode = await prisma.franchise.findUnique({ where: { code } });
      if (conflictCode && conflictCode.id !== id) {
        res.status(409).json({ message: "A franchise with this code already exists." });
        return;
      }
    }

    // Check email uniqueness
    if (email !== currentFranchise.email) {
      const conflictFranchise = await prisma.franchise.findUnique({ where: { email } });
      if (conflictFranchise && conflictFranchise.id !== id) {
        res.status(409).json({ message: "A record with this email already exists." });
        return;
      }
      const conflictUser = await prisma.user.findUnique({ where: { email } });
      if (conflictUser && conflictUser.franchiseId !== id) {
        res.status(409).json({ message: "A user account with this email already exists." });
        return;
      }
    }

    const updated = await prisma.franchise.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code,
        ownerName: data.ownerName ? data.ownerName.trim() : undefined,
        email,
        phone: data.phone ? data.phone.trim() : undefined,
        emergencyPhone: data.emergencyPhone !== undefined ? (data.emergencyPhone ? data.emergencyPhone.trim() : null) : undefined,
        address: data.address !== undefined ? (data.address ? data.address.trim() : null) : undefined,
        city: data.city ? data.city.trim() : undefined,
        state: data.state ? data.state.trim() : undefined,
        country: data.country ? data.country.trim() : undefined,
        pincode: data.pincode !== undefined ? (data.pincode ? data.pincode.trim() : null) : undefined,
        licenseNumber: data.licenseNumber !== undefined ? (data.licenseNumber ? data.licenseNumber.trim() : null) : undefined,
        gstNumber: data.gstNumber !== undefined ? (data.gstNumber ? data.gstNumber.trim() : null) : undefined,
        revenueShare: data.revenueShare !== undefined ? Number(data.revenueShare) : undefined,
        status: data.status,
        notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : undefined,
      },
    });

    // Update or sync the linked user account credentials
    let passwordHash: string | undefined = undefined;
    if (data.password && typeof data.password === "string" && data.password.trim().length >= 4) {
      passwordHash = await hashPassword(data.password.trim());
    }

    const linkedUser = await prisma.user.findFirst({
      where: {
        OR: [{ franchiseId: id }, { email: currentFranchise.email }],
      },
    });

    if (linkedUser) {
      await prisma.user.update({
        where: { id: linkedUser.id },
        data: {
          name: updated.ownerName,
          email: updated.email,
          mobile: updated.phone,
          location: `${updated.name} (${updated.city})`,
          active: updated.status === "Active",
          passwordHash: passwordHash || undefined,
          franchiseId: updated.id,
        },
      });
    } else if (passwordHash) {
      // Create user if missing
      await prisma.user.create({
        data: {
          name: updated.ownerName,
          email: updated.email,
          passwordHash,
          role: "Franchise",
          active: updated.status === "Active",
          mobile: updated.phone,
          location: `${updated.name} (${updated.city})`,
          franchiseId: updated.id,
          permissions: [
            "patients:read",
            "patients:write",
            "samples:read",
            "samples:write",
            "reports:read",
            "billing:read",
            "billing:write",
            "inventory:read",
          ],
        },
      });
    }

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Delete associated franchise users first or unlink
    await prisma.user.deleteMany({ where: { franchiseId: id } }).catch(() => {});

    // Delete franchise
    await prisma.franchise.delete({ where: { id } });

    res.json({ message: "Franchise deleted successfully" });
  } catch (error) {
    next(error);
  }
};
