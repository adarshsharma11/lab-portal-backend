import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/auth";
import { prisma } from "../lib/prisma";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    initials: string | null;
    permissions: string[];
    franchiseId: string | null;
  };
}

export const protectAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication token is required." });
      return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "Invalid authorization format." });
      return;
    }

    const payload: JwtPayload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        initials: true,
        permissions: true,
        active: true,
        franchiseId: true,
      },
    });

    if (!user || !user.active) {
      res.status(401).json({ message: "User account not found or inactive." });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired session token." });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token) {
        const payload: JwtPayload = verifyToken(token);
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            initials: true,
            permissions: true,
            active: true,
            franchiseId: true,
          },
        });
        if (user && user.active) {
          req.user = user;
        }
      }
    }
  } catch {
    // Ignore invalid token in optionalAuth
  }
  next();
};

export const requireRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (
      req.user.role === "Admin" ||
      req.user.role === "Administrator" ||
      allowedRoles.includes(req.user.role)
    ) {
      next();
      return;
    }

    res.status(403).json({ message: "Permission denied for this role." });
  };
};

/**
 * Returns tenant scope for querying and mutating resources.
 * - If user is not an Admin (Franchise, Technician, Doctor, Pathologist, Billing, Staff, etc.),
 *   `isFranchise` is true and `franchiseId` is strictly locked to `req.user.franchiseId`.
 * - If user is an Admin, `isAdmin` is true and `franchiseId` can be optionally filtered via `req.query.franchiseId`.
 */
export const getTenantScope = (req: AuthenticatedRequest) => {
  const isAdmin = req.user?.role === "Admin" || req.user?.role === "Administrator";
  const isFranchise = !isAdmin;
  const userFranchiseId = req.user?.franchiseId ?? null;

  let queryFranchiseId: string | null = null;
  if (typeof req.query?.franchiseId === "string" && req.query.franchiseId.trim() && req.query.franchiseId !== "all") {
    queryFranchiseId = req.query.franchiseId.trim();
  }

  // Non-admin users are strictly locked to their assigned franchise.
  // If a non-admin has no franchise assigned, use a non-matching sentinel so cross-franchise data is never exposed.
  const effectiveFranchiseId = isFranchise
    ? (userFranchiseId ?? "__NO_FRANCHISE_ACCESS__")
    : queryFranchiseId;

  return {
    isFranchise,
    isAdmin,
    userFranchiseId,
    effectiveFranchiseId,
  };
};
