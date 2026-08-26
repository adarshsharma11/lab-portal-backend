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

  // Prisma unique constraint violation
  if (err.code === "P2002") {
    const rawTarget = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : String(err.meta?.target || "field");
    let target = "value";
    if (rawTarget.includes("email")) target = "email";
    else if (rawTarget.includes("patientCode") || rawTarget.includes("patient_code")) target = "patient code";
    else if (rawTarget.includes("accession")) target = "accession number";
    else if (rawTarget.includes("billNumber") || rawTarget.includes("bill_number")) target = "bill number";
    else if (rawTarget.includes("reportNumber") || rawTarget.includes("report_number")) target = "report number";
    res.status(409).json({ message: `A record with this ${target} already exists.` });
    return;
  }

  // Prisma foreign key constraint violation
  if (err.code === "P2003") {
    const fieldName = err.meta?.field_name || "relation";
    res.status(400).json({ message: `Referenced record not found (${fieldName}). Please select a valid entity.` });
    return;
  }

  // Prisma record not found
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
