import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

// Routes
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import patientsRoutes from "./routes/patients.routes";
import doctorsRoutes from "./routes/doctors.routes";
import suppliersRoutes from "./routes/suppliers.routes";
import usersRoutes from "./routes/users.routes";
import samplesRoutes from "./routes/samples.routes";
import testsRoutes from "./routes/tests.routes";
import resultsRoutes from "./routes/results.routes";
import reportsRoutes from "./routes/reports.routes";
import appointmentsRoutes from "./routes/appointments.routes";
import billingRoutes from "./routes/billing.routes";
import inventoryRoutes from "./routes/inventory.routes";
import instrumentsRoutes from "./routes/instruments.routes";
import analyzerRoutes from "./routes/analyzer.routes";
import qcRoutes from "./routes/qc.routes";
import settingsRoutes from "./routes/settings.routes";
import profileRoutes from "./routes/profile.routes";

export const createApp = (): Express => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow all local origins or specified origin
        if (!origin || origin.includes("localhost") || origin.includes("127.0.0.1") || origin === config.origin) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive for testing
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "healthy",
      service: "lab-portal-backend",
      environment: config.env,
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/patients", patientsRoutes);
  app.use("/api/doctors", doctorsRoutes);
  app.use("/api/suppliers", suppliersRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/samples", samplesRoutes);
  app.use("/api/tests", testsRoutes);
  app.use("/api/results", resultsRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/appointments", appointmentsRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/instruments", instrumentsRoutes);
  app.use("/api/analyzer", analyzerRoutes);
  app.use("/api/qc", qcRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/profile", profileRoutes);

  // 404 & Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;
