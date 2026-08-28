import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { comparePassword, generateToken, hashPassword } from "../utils/auth";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["Doctor", "Technician", "Pathologist", "Other"]).default("Doctor"),
  mobile: z.string().optional(),
  location: z.string().optional(),
});

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      res.status(400).json({ message: "An account with this email address already exists." });
      return;
    }

    const passwordHash = await hashPassword(data.password);
    const initials = data.name
      .split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

    let permissions: string[] = ["patients:read"];
    if (data.role === "Technician") {
      permissions = ["patients:read", "patients:write", "samples:write", "results:write"];
    } else if (data.role === "Pathologist") {
      permissions = ["patients:read", "results:read", "reports:read", "reports:approve", "qc:manage"];
    } else if (data.role === "Doctor") {
      permissions = ["patients:read", "patients:write", "reports:read", "appointments:write"];
    } else if (data.role === "Other") {
      permissions = ["patients:read"];
    }

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        passwordHash,
        role: data.role,
        initials,
        active: true,
        permissions,
        mobile: data.mobile || null,
        location: data.location || null,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;

    res.status(201).json({
      data: { ...safeUser, token },
      token,
      message: "Account created successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        franchise: {
          select: { id: true, name: true, code: true, city: true, status: true },
        },
      },
    });

    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    if (!user.active) {
      res.status(403).json({ message: "Your account is currently disabled." });
      return;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;

    res.json({
      data: { ...safeUser, token },
      token,
      message: "Login successful",
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: "Logout successful" });
};

export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        franchise: {
          select: { id: true, name: true, code: true, city: true, status: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const { passwordHash: _, ...safeUser } = user;
    res.json({ data: safeUser });
  } catch (error) {
    next(error);
  }
};
