import { app } from "./app";
import { config } from "./config/env";
import { prisma } from "./lib/prisma";

const server = app.listen(config.port, () => {
  console.log(`========================================`);
  console.log(`  Lab Portal Backend API Server`);
  console.log(`  Running on: http://localhost:${config.port}`);
  console.log(`  Environment: ${config.env}`);
  console.log(`  Database: Connected to PostgreSQL (lab_portal)`);
  console.log(`========================================`);
});

const gracefulShutdown = async () => {
  console.log("Shutting down server gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Database disconnected. Server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default app;
