# Laboratory Information Management System (LIMS) — Backend API

Backend REST API for the Pathology Laboratory Information Management System (LIS / LIMS), built with **Node.js**, **Express**, **TypeScript**, **Prisma ORM**, and **PostgreSQL**.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v18+ / v20+)
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM & Database**: Prisma ORM with PostgreSQL
- **Authentication**: JWT (JSON Web Tokens) & HTTP-only cookies
- **Validation**: Zod schema validation
- **Logging**: Pino & Pino-Pretty

---

## 📋 Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (version 18.x or higher)
- [npm](https://www.npmjs.com/) (bundled with Node.js)
- [PostgreSQL](https://www.postgresql.org/) database server (local or hosted, ., Supabase, Neon, Railway, RDS)

---

## 🚀 Step-by-Step Setup Guide

### 1. Navigate to Backend Directory

```bash
cd lab-portal-backend
```

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Configure Environment Variables

Create a `.env` file in the root of `lab-portal-backend` by copying `.env.example`:

```bash
cp .env.example .env
```

Open `.env` and configure your database connection and environment settings:

```env
# Application Environment
APP_ENV="development"
PORT=5001

# PostgreSQL Database Connection URL
DATABASE_URL="postgresql://<username>:<password>@<host>:5432/<database_name>?schema=public"

# JWT Secret Key (used for signing authentication tokens)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Frontend Origin for CORS
ORIGIN="http://localhost:3000"
```

> **Note**: Replace `<username>`, `<password>`, `<host>`, and `<database_name>` with your actual PostgreSQL credentials.

---

### 4. Database Setup & Migrations

#### A. Generate Prisma Client
Generates TypeScript types and Prisma query client:

```bash
npx prisma generate
```

#### B. Push Database Schema
Syncs your Prisma schema (`prisma/schema.prisma`) directly with your PostgreSQL database:

```bash
npx prisma db push
```
or npx prisma db push --accept-data-loss

#### C. Seed Database
Populates the database with initial configurations, test catalogs, instruments, reference ranges, and default role accounts (including the primary Administrator account):

```bash
npm run seed
```
*(Or directly via `npx prisma db seed`)*
or 
npx ts-node -r dotenv/config prisma/seed_test_masters.ts



# 4. Seed the 1,042 Test Master records into the database
node --require esbuild-register prisma/seed_test_masters.ts
npx tsx prisma/seed-sub-parameters.ts  
---

## 🏃 Running the Server

### Development Mode (with hot reloading)
Runs the server with `ts-node-dev` on `http://localhost:5001`:

```bash
npm run dev
```

### Production Build & Run

```bash
# 1. Compile TypeScript to JavaScript and generate Prisma client
npm run build

# 2. Start the production server
npm start
```

### Health Check Endpoint
Once the server is running, verify it by visiting:
- `http://localhost:5001/api/health`

Expected response:
```json
{
  "status": "healthy",
  "service": "lab-portal-backend",
  "environment": "development",
  "timestamp": "2026-08-23T17:15:00.000Z"
}
```

---

## 👥 Default Seeded User Accounts

When you run `npm run seed`, the following test accounts are created:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@lis.local` | `Admin@123` | Full administrative control, user & role management, billing, settings |
| **Technician** | `rohan@lis.local` | `Rohan@123` | Specimen collection, laboratory testing, analyzer interfacing |
| **Pathologist** | `pathologist@lis.local` | `Pathologist@123` | Report authorization, critical value review, QC validation |
| **Doctor** | `doctor@lis.local` | `Doctor@123` | Patient referral history, consultations, view verified reports |

> 🔒 **Security Notice**: Only one default Admin account exists. Public signup is restricted to Doctor, Technician, Pathologist, and Other roles.

---

## 📡 API Route Directory

All API endpoints are prefixed with `/api`:

| Base Path | Description |
| :--- | :--- |
| `/api/auth` | User login, logout, public registration & session verification |
| `/api/dashboard` | Aggregated analytics, operational KPIs, pending test counts & revenue |
| `/api/patients` | Patient registration, search, medical history & demographics |
| `/api/doctors` | Referring physician profiles, specialties & commission tracking |
| `/api/samples` | Specimen accessioning, barcode tracking & sample status workflow |
| `/api/tests` | Diagnostic test catalog, pricing, specimen requirements & turn-around times |
| `/api/results` | Test parameter values, normal/critical range evaluation & flags |
| `/api/reports` | Diagnostic report generation, pathologist sign-off & PDF delivery |
| `/api/appointments` | Home collection & lab visit scheduling |
| `/api/billing` | Invoice generation, discount management, payments & dues tracking |
| `/api/inventory` | Reagents, consumables stock levels, batch/expiry & purchase orders |
| `/api/instruments` | Lab equipment registry, calibration schedules & maintenance logs |
| `/api/analyzer` | Bidirectional analyzer interface, automated result parsing & orders |
| `/api/qc` | Westgard rule evaluations, Levey-Jennings charts & QC parameter controls |
| `/api/settings` | Laboratory details, letterhead, reference units & notification rules |
| `/api/users` | Staff directory, role-based permissions & account activation |
| `/api/profile` | Current logged-in user profile, avatar & contact update |
| `/api/health` | Service health status check |

---

## 📁 Project Directory Structure

```text
lab-portal-backend/
├── prisma/
│   ├── schema.prisma       # Database models & relations
│   └── seed.ts             # Database seeder with sample clinical data
├── src/
│   ├── app.ts              # Express application configuration & routing
│   ├── index.ts            # Server entry point & listener
│   ├── config/             # Environment variables & constants
│   ├── controllers/        # Request handling & business orchestration
│   ├── lib/                # Prisma client & database singleton
│   ├── middleware/         # Authentication, RBAC & error handlers
│   ├── routes/             # Express route definitions
│   ├── services/           # Reusable domain business logic
│   └── utils/              # Token generation, hashing & helpers
├── .env.example            # Environment variables template
├── package.json            # Node.js dependencies & scripts
├── tsconfig.json           # TypeScript compiler configuration
└── README.md               # Setup and documentation guide
```

---

## 🔧 Useful NPM Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript and generate Prisma Client |
| `npm start` | Run compiled production bundle |
| `npm run seed` | Seed database with demo data and admin credentials |
| `npx prisma studio` | Open Prisma visual database browser in web browser |
| `npx prisma db push` | Push schema changes to database without migrations |
| `npx prisma db pull` | Pull database schema from existing database |
