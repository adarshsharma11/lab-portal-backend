import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let userId = req.user?.id;

    if (!userId) {
      // Default to admin user for dev/demo if not authenticated
      const admin = await prisma.user.findFirst({ where: { role: "Admin" } });
      userId = admin?.id;
    }

    if (!userId) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        initials: true,
        active: true,
        permissions: true,
        avatar: true,
        mobile: true,
        dateOfBirth: true,
        gender: true,
        location: true,
      },
    });

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let userId = req.user?.id;
    if (!userId) {
      const admin = await prisma.user.findFirst({ where: { role: "Admin" } });
      userId = admin?.id;
    }

    if (!userId) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const data = req.body;
    let initials = data.initials;
    if (!initials && data.name) {
      initials = data.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email ? data.email.toLowerCase().trim() : undefined,
        initials,
        avatar: data.avatar,
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
        avatar: true,
        mobile: true,
        dateOfBirth: true,
        gender: true,
        location: true,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
};
