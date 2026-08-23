import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 6000,
  jwtSecret: process.env.JWT_SECRET || "super-secret-jwt-key-for-lab-portal-2026",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/lab_portal?schema=public",
  origin: process.env.ORIGIN || "http://localhost:3000",
};
