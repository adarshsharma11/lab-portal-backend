import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/auth";

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

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roleFilter = typeof req.query.role === "string" ? req.query.role.trim() : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    const where: any = {};
    if (roleFilter) {
      where.role = { equals: roleFilter, mode: "insensitive" };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
      ];
    }

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
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: users });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
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
        createdAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Staff full name is required" });
      return;
    }
    if (!data.email || typeof data.email !== "string" || !data.email.trim()) {
      res.status(400).json({ message: "Official email address is required" });
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

    const email = data.email.toLowerCase().trim();

    const created = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        passwordHash,
        role,
        initials,
        active: data.active !== undefined ? Boolean(data.active) : true,
        permissions,
        mobile: data.mobile || data.phone || null,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        location: data.location || data.city || null,
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
          },
        });
      }
    }

    res.status(201).json({ data: created });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

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
        active: data.active !== undefined ? Boolean(data.active) : undefined,
        permissions,
        mobile: data.mobile || data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        location: data.location || data.city,
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
          },
        });
      }
    }

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (user?.email && user.role === "Doctor") {
      await prisma.doctor.deleteMany({ where: { email: user.email } }).catch(() => {});
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};
