import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../utils/auth";

export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const doctors = await prisma.doctor.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { specialty: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: doctors });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { patients: true, appointments: true, reports: true },
    });
    if (!doctor) {
      res.status(404).json({ message: "Doctor not found" });
      return;
    }
    res.json({ data: doctor });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = req.body;
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      res.status(400).json({ message: "Doctor name is required" });
      return;
    }
    if (!data.phone || typeof data.phone !== "string" || !data.phone.trim()) {
      res.status(400).json({ message: "Doctor phone number is required" });
      return;
    }

    const created = await prisma.doctor.create({
      data: {
        name: data.name.trim(),
        specialty: data.specialty || "General Medicine",
        phone: data.phone || "",
        email: data.email ? data.email.toLowerCase().trim() : null,
        city: data.city || null,
        gender: data.gender || null,
        experience: data.experience || null,
        description: data.description || null,
        dateOfJoining: data.dateOfJoining || null,
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

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await prisma.doctor.update({
      where: { id },
      data: {
        name: data.name,
        specialty: data.specialty,
        phone: data.phone,
        email: data.email ? data.email.toLowerCase().trim() : undefined,
        city: data.city,
        gender: data.gender,
        experience: data.experience,
        description: data.description,
        dateOfJoining: data.dateOfJoining,
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
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (doctor?.email) {
      await prisma.user.deleteMany({ where: { email: doctor.email } }).catch(() => {});
    }
    await prisma.doctor.delete({ where: { id } });
    res.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    next(error);
  }
};
