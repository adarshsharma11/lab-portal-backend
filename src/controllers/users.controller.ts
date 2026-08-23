import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/auth";

export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
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

    const password = data.password || "Password@123";
    const passwordHash = await hashPassword(password);

    const initials = data.initials || (data.name
      ? data.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
      : "U");

    const permissions = Array.isArray(data.permissions)
      ? data.permissions
      : typeof data.permissions === "string"
      ? data.permissions.split(",").map((p: string) => p.trim())
      : ["patients:read"];

    const created = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role || "Technician",
        initials,
        active: data.active !== undefined ? Boolean(data.active) : true,
        permissions,
        mobile: data.mobile || null,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        location: data.location || null,
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
        ? data.permissions.split(",").map((p: string) => p.trim())
        : undefined
      : undefined;

    let passwordHash: string | undefined = undefined;
    if (data.password) {
      passwordHash = await hashPassword(data.password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email ? data.email.toLowerCase().trim() : undefined,
        passwordHash,
        role: data.role,
        initials,
        active: data.active !== undefined ? Boolean(data.active) : undefined,
        permissions,
        mobile: data.mobile,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        location: data.location,
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
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};
