import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("API Error:", err);

  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: err.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    });
    return;
  }

  if (err.name === "NotFoundError" || err.code === "P2025") {
    res.status(404).json({ message: err.message || "Record not found" });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({ message });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};
