import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/auth";
import { AuthenticatedRequest, getTenantScope } from "../middleware/auth.middleware";

const getDefaultPermissionsForRole = (role: string): string[] => {
  switch (role) {
    case "Administrator":
    case "Admin":
      return ["*"];
    case "Pathologist":
      return ["reports:approve", "results:write", "qc:manage", "patients:read", "samples:read"];
    case "Technician":
      return ["samples:write", "results:write", "instruments:manage", "patients:read", "qc:read"];
    case "Doctor":
      return ["patients:read", "reports:read", "appointments:read", "billing:read"];
    case "Receptionist":
      return ["patients:write", "appointments:write", "billing:write"];
    case "Billing":
      return ["billing:manage", "patients:read", "reports:read"];
    default:
      return ["read:all"];
  }
};

export const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { isFranchise, userFranchiseId, effectiveFranchiseId } = getTenantScope(req);
    const roleFilter = typeof req.query.role === "string" ? req.query.role.trim() : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    if (isFranchise && !userFranchiseId) {
      res.json({ data: [] });
      return;
    }

    const where: any = {
      AND: [
        roleFilter ? { role: { equals: roleFilter, mode: "insensitive" } } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { mobile: { contains: search, mode: "insensitive" } },
                { role: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
        isFranchise ? { franchiseId: userFranchiseId } : (effectiveFranchiseId ? { franchiseId: effectiveFranchiseId } : {}),
      ],
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        initials: true,
        active: true,
        permissions: true,
        mobile: true,
        dateOfBirth: true,
        gender: true,
        location: true,
        franchiseId: true,
        franchise: { select: { id: true, name: true, code: true, city: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFranchise, userFranchiseId } = getTenantScope(req);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        initials: true,
        active: true,
        permissions: true,
        mobile: true,
        dateOfBirth: true,
        gender: true,
        location: true,
        franchiseId: true,
        franchise: { select: { id: true, name: true, code: true, city: true } },
        createdAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (isFranchise && user.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. User belongs to another franchise." });
      return;
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    const { isFranchise, isAdmin, userFranchiseId } = getTenantScope(req);

    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Staff full name is required" });
      return;
    }
    if (!data.email || typeof data.email !== "string" || !data.email.trim()) {
      res.status(400).json({ message: "Official email address is required" });
      return;
    }

    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ message: "A user account with this email address already exists." });
      return;
    }

    const role = data.role || "Technician";
    const password = data.password || "Password@123";
    const passwordHash = await hashPassword(password);

    const initials = data.initials || (data.name
      ? data.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
      : "U");

    let permissions: string[];
    if (data.permissions) {
      if (Array.isArray(data.permissions)) {
        permissions = data.permissions;
      } else if (typeof data.permissions === "string") {
        permissions = data.permissions.split(",").map((p: string) => p.trim()).filter(Boolean);
      } else {
        permissions = getDefaultPermissionsForRole(role);
      }
    } else {
      permissions = getDefaultPermissionsForRole(role);
    }

    let franchiseId: string | null = null;
    const isTargetAdmin = role === "Admin" || role === "Administrator";

    if (isFranchise) {
      if (isTargetAdmin) {
        res.status(403).json({ message: "Only administrators can create Admin accounts." });
        return;
      }
      if (!userFranchiseId) {
        res.status(403).json({ message: "User is not assigned to any franchise." });
        return;
      }
      franchiseId = userFranchiseId;
    } else {
      // If creating an Admin account, franchise is optional (global system access)
      if (isTargetAdmin) {
        franchiseId = data.franchiseId && typeof data.franchiseId === "string" && data.franchiseId.trim()
          ? data.franchiseId.trim()
          : null;
      } else {
        // Staff/technician/doctor creation requires franchise selection
        if (!data.franchiseId || typeof data.franchiseId !== "string" || !data.franchiseId.trim()) {
          res.status(400).json({ message: "Franchise selection is required for this staff member." });
          return;
        }
        franchiseId = data.franchiseId.trim();
      }
    }

    const created = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        passwordHash,
        role,
        initials,
        active: data.status !== undefined ? data.status !== "Inactive" : (data.active !== undefined ? Boolean(data.active) : true),
        permissions,
        mobile: data.mobile || data.phone || null,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        location: data.location || data.city || null,
        franchiseId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        initials: true,
        active: true,
        permissions: true,
        mobile: true,
        dateOfBirth: true,
        gender: true,
        location: true,
        franchiseId: true,
        franchise: { select: { id: true, name: true, code: true, city: true } },
        createdAt: true,
      },
    });

    // If role is Doctor, also keep Doctor directory synced
    if (role === "Doctor") {
      const existingDoc = await prisma.doctor.findFirst({ where: { email } });
      if (!existingDoc) {
        await prisma.doctor.create({
          data: {
            name: data.name.trim(),
            specialty: data.specialty || "Pathology & Clinical Medicine",
            phone: data.mobile || data.phone || "+91 9800000000",
            email,
            city: data.location || data.city || null,
            gender: data.gender || null,
            experience: data.experience || null,
            description: data.description || null,
            dateOfJoining: data.dateOfJoining || null,
            franchiseId,
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

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (isFranchise && existing.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot update staff belonging to another franchise." });
      return;
    }

    let initials = data.initials;
    if (!initials && data.name) {
      initials = data.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
    }

    const permissions = data.permissions
      ? Array.isArray(data.permissions)
        ? data.permissions
        : typeof data.permissions === "string"
        ? data.permissions.split(",").map((p: string) => p.trim()).filter(Boolean)
        : undefined
      : undefined;

    let passwordHash: string | undefined = undefined;
    if (data.password && typeof data.password === "string" && data.password.trim()) {
      passwordHash = await hashPassword(data.password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name ? data.name.trim() : undefined,
        email: data.email ? data.email.toLowerCase().trim() : undefined,
        passwordHash,
        role: data.role,
        initials,
        active: data.status !== undefined ? data.status !== "Inactive" : (data.active !== undefined ? Boolean(data.active) : undefined),
        permissions,
        mobile: data.mobile || data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        location: data.location || data.city,
        franchiseId: isFranchise ? undefined : (data.franchiseId !== undefined ? data.franchiseId : undefined),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        initials: true,
        active: true,
        permissions: true,
        mobile: true,
        dateOfBirth: true,
        gender: true,
        location: true,
        franchiseId: true,
        franchise: { select: { id: true, name: true, code: true, city: true } },
        createdAt: true,
      },
    });

    if (updated.role === "Doctor" && updated.email) {
      const existingDoc = await prisma.doctor.findFirst({ where: { email: updated.email } });
      if (existingDoc) {
        await prisma.doctor.update({
          where: { id: existingDoc.id },
          data: {
            name: updated.name,
            phone: updated.mobile || existingDoc.phone,
            city: updated.location || existingDoc.city,
            gender: updated.gender || existingDoc.gender,
            franchiseId: updated.franchiseId,
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

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Prevent user from deleting their own logged-in account
    if (
      req.user?.id === id ||
      (req.user?.email && user.email && req.user.email.toLowerCase() === user.email.toLowerCase())
    ) {
      res.status(400).json({ message: "You cannot delete your own logged-in account." });
      return;
    }

    if (isFranchise && user.franchiseId !== userFranchiseId) {
      res.status(403).json({ message: "Access denied. Cannot delete user belonging to another franchise." });
      return;
    }

    if (user?.email && user.role === "Doctor") {
      await prisma.doctor.deleteMany({ where: { email: user.email } }).catch(() => {});
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

