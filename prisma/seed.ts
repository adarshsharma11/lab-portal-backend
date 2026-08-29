import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import process from "node:process";
import { seedTestMasters } from "./seed_test_masters";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data in reverse order of foreign keys
  await prisma.auditActivity.deleteMany({});
  await prisma.qCViolation.deleteMany({});
  await prisma.qCRun.deleteMany({});
  await prisma.qCParameter.deleteMany({});
  await prisma.analyzerIntegrationError.deleteMany({});
  await prisma.analyzerOrder.deleteMany({});
  await prisma.analyzerResult.deleteMany({});
  await prisma.instrument.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.reportTemplate.deleteMany({});
  await prisma.result.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.sample.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.doctor.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.laboratorySetting.deleteMany({});
  await prisma.reportSetting.deleteMany({});
  await prisma.referenceRange.deleteMany({});
  await prisma.unitDefinition.deleteMany({});
  await prisma.notificationSetting.deleteMany({});
  await prisma.systemPreference.deleteMany({});

  // 1. Users
  const passwordHash = await bcrypt.hash("Admin@123", 10);
  const rohanPasswordHash = await bcrypt.hash("Rohan@123", 10);

  const adminUser = await prisma.user.create({
    data: {
      id: "usr-01",
      name: "Dr. Ananya Rao",
      email: "admin@lis.local",
      passwordHash: passwordHash,
      role: "Admin",
      initials: "AR",
      active: true,
      permissions: [
        "patients:read", "patients:write", "samples:write", "results:write",
        "reports:approve", "qc:manage", "users:manage", "billing:manage", "inventory:manage"
      ],
      mobile: "+91 98800 11223",
      dateOfBirth: "1985-04-12",
      gender: "Female",
      location: "Bengaluru, Karnataka",
    },
  });

  await prisma.user.create({
    data: {
      id: "usr-02",
      name: "Rohan Iyer",
      email: "rohan@lis.local",
      passwordHash: rohanPasswordHash,
      role: "Technician",
      initials: "RI",
      active: true,
      permissions: ["patients:read", "patients:write", "samples:write", "results:write"],
      mobile: "+91 98450 33445",
      dateOfBirth: "1992-07-19",
      gender: "Male",
      location: "Bengaluru, Karnataka",
    },
  });

  const pathPasswordHash = await bcrypt.hash("Pathologist@123", 10);
  await prisma.user.create({
    data: {
      id: "usr-03",
      name: "Dr. Sunita Sharma",
      email: "pathologist@lis.local",
      passwordHash: pathPasswordHash,
      role: "Pathologist",
      initials: "SS",
      active: true,
      permissions: ["patients:read", "results:read", "reports:read", "reports:approve", "qc:manage"],
      mobile: "+91 98470 44556",
      dateOfBirth: "1980-11-22",
      gender: "Female",
      location: "Bengaluru, Karnataka",
    },
  });

  const docPasswordHash = await bcrypt.hash("Doctor@123", 10);
  await prisma.user.create({
    data: {
      id: "usr-04",
      name: "Dr. K. Menon",
      email: "doctor@lis.local",
      passwordHash: docPasswordHash,
      role: "Doctor",
      initials: "KM",
      active: true,
      permissions: ["patients:read", "patients:write", "reports:read", "appointments:write"],
      mobile: "+91 98470 11223",
      dateOfBirth: "1978-03-15",
      gender: "Male",
      location: "Bengaluru, Karnataka",
    },
  });

  // 2. Doctors
  const doctor1 = await prisma.doctor.create({
    data: {
      id: "doc-01",
      name: "Dr. K. Menon",
      specialty: "Internal Medicine",
      phone: "+91 98470 11223",
      email: "kmenon@clinic.com",
      city: "Bengaluru",
      gender: "Male",
      experience: "14 years",
      description: "Consultant Physician with specialization in metabolic disorders.",
      dateOfJoining: "2018-05-10",
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      id: "doc-02",
      name: "Dr. Sunita Sharma",
      specialty: "Pathology",
      phone: "+91 98470 44556",
      email: "ssharma@clinic.com",
      city: "Bengaluru",
      gender: "Female",
      experience: "11 years",
      description: "Senior Pathologist & Cytogeneticist.",
      dateOfJoining: "2020-02-15",
    },
  });

  // 3. Patients
  const patient1 = await prisma.patient.create({
    data: {
      id: "pat-01",
      patientCode: "PT-24018",
      name: "Maya Srinivasan",
      age: 36,
      sex: "Female",
      phone: "+91 98765 20318",
      email: "maya@example.com",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560034",
      address: "14B, Palm Meadows, Whitefield",
      emergencyContact: "+91 98765 20300",
      bloodGroup: "B+",
      referringDoctorId: doctor1.id,
      status: "Active",
      dateOfBirth: "1990-04-12",
      createdAt: new Date("2026-08-22T08:00:00Z"),
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      id: "pat-02",
      patientCode: "PT-24019",
      name: "Arjun Mehta",
      age: 52,
      sex: "Male",
      phone: "+91 98765 20319",
      email: "arjun.mehta@example.com",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
      address: "88 MG Road",
      emergencyContact: "+91 98765 20301",
      bloodGroup: "O+",
      referringDoctorId: doctor1.id,
      status: "Active",
      dateOfBirth: "1974-10-03",
      createdAt: new Date("2026-08-22T08:30:00Z"),
    },
  });

  // 4. Suppliers
  await prisma.supplier.create({
    data: {
      id: "sup-01",
      name: "Medisource Diagnostics",
      phone: "+91 99800 11223",
      city: "Bengaluru",
      country: "India",
      pincode: "560001",
      address: "Plot 42, Peenya Industrial Area",
      state: "Karnataka",
      description: "Consumables, vacutainers and biochemical reagents supplier",
      emergencyContact: "+91 99800 11220",
    },
  });

  await prisma.supplier.create({
    data: {
      id: "sup-02",
      name: "Sysmex Healthcare India",
      phone: "+91 22 6677 8899",
      city: "Mumbai",
      country: "India",
      pincode: "400051",
      address: "BKC Tech Park, Bandra East",
      state: "Maharashtra",
      description: "OEM instruments and hematology calibrators",
      emergencyContact: "+91 22 6677 8800",
    },
  });

  // 5. Samples
  const sample1 = await prisma.sample.create({
    data: {
      id: "smp-01",
      accession: "LIS-260822-041",
      barcode: "LIS260822041",
      patientId: patient1.id,
      sampleType: "Blood",
      collectedAt: new Date("2026-08-22T08:45:00Z"),
      priority: "STAT",
      status: "Processing",
      notes: "Fasting EDTA sample",
    },
  });

  const sample2 = await prisma.sample.create({
    data: {
      id: "smp-02",
      accession: "LIS-260822-042",
      barcode: "LIS260822042",
      patientId: patient2.id,
      sampleType: "Serum",
      collectedAt: new Date("2026-08-22T09:10:00Z"),
      priority: "Routine",
      status: "Collected",
      notes: "Routine serum chemistry",
    },
  });

  // 6. Tests & Results
  const test1 = await prisma.test.create({
    data: {
      id: "tst-01",
      code: "CBC",
      name: "Complete Blood Count",
      department: "Hematology",
      sampleId: sample1.id,
      sampleType: "Blood",
      price: 450,
      referenceRange: "See parameters",
      unit: "",
      turnaroundHours: 4,
      status: "Active",
    },
  });

  const test2 = await prisma.test.create({
    data: {
      id: "tst-02",
      code: "ELECT",
      name: "Serum Electrolytes",
      department: "Electrolytes",
      sampleId: sample1.id,
      sampleType: "Serum",
      price: 600,
      referenceRange: "See parameters",
      unit: "mmol/L",
      turnaroundHours: 2,
      status: "Active",
    },
  });

  const result1 = await prisma.result.create({
    data: {
      id: "res-01",
      testId: test1.id,
      parameter: "Hemoglobin",
      value: "11.2",
      unit: "g/dL",
      referenceRange: "12.0–15.5",
      abnormalFlag: true,
      criticalFlag: false,
      comments: "Mild microcytic anemia picture",
    },
  });

  const result2 = await prisma.result.create({
    data: {
      id: "res-02",
      testId: test2.id,
      parameter: "Potassium",
      value: "6.8",
      unit: "mmol/L",
      referenceRange: "3.5–5.1",
      abnormalFlag: true,
      criticalFlag: true,
      comments: "CRITICAL: Elevated potassium. Immediate clinician notification required.",
    },
  });

  // 7. Reports & Templates
  await prisma.report.create({
    data: {
      id: "rpt-01",
      reportNumber: "RPT-260822-018",
      patientId: patient1.id,
      sampleId: sample1.id,
      doctorId: doctor1.id,
      testIds: [test1.id, test2.id],
      resultIds: [result1.id, result2.id],
      department: "Hematology",
      priority: "STAT",
      status: "Pending Review",
      pathologist: "Dr. Ananya Rao",
      comments: "Clinical correlation recommended for serum potassium level.",
      createdAt: new Date("2026-08-22T10:25:00Z"),
    },
  });

  await prisma.reportTemplate.create({
    data: {
      id: "tpl-01",
      name: "CBC Standard",
      department: "Hematology",
      tests: ["CBC", "Hemoglobin", "RBC", "WBC", "Platelets"],
      header: "BL Dignostic LIMS Reference Laboratory",
      footer: "This is a computer-generated report and does not require manual signature. Interpret clinically.",
      referenceRanges: "Adult Indian reference ranges",
      notes: "Specimen processed on automated Sysmex XN-1000 hematology system.",
      signatory: "Dr. Ananya Rao",
      active: true,
    },
  });

  // 8. Appointments & Invoices
  await prisma.appointment.create({
    data: {
      id: "apt-01",
      patientId: patient1.id,
      doctorId: doctor1.id,
      date: "2026-08-23",
      time: "10:30",
      type: "Consultation",
      status: "Upcoming",
      appointmentLink: "https://meet.example/apt-01",
      createdBy: "Dr. Ananya Rao",
    },
  });

  await prisma.invoice.create({
    data: {
      id: "inv-01",
      billNumber: "INV-260822-018",
      patientId: patient1.id,
      doctorId: doctor1.id,
      billDate: "2026-08-22",
      items: [
        { description: "Complete Blood Count", quantity: 1, mrp: 450 },
        { description: "Serum Electrolytes", quantity: 1, mrp: 600 }
      ],
      discount: 50,
      sgst: 45.0,
      cgst: 45.0,
      total: 1040.0,
      paymentStatus: "Paid",
      addedBy: "Dr. Ananya Rao",
    },
  });

  // 9. Inventory Items
  await prisma.inventoryItem.createMany({
    data: [
      {
        id: "invty-01",
        medicine: "EDTA Vacutainer (2ml Lavender)",
        stockQuantity: 18,
        purchasePrice: 11,
        salePrice: 18,
        stockHolder: "Central Store",
        batchNumber: "EDTA-2411",
        expiryDate: "2027-01-31",
        reorderLevel: 25,
      },
      {
        id: "invty-02",
        medicine: "Glucose GOD-POD Reagent",
        stockQuantity: 52,
        purchasePrice: 280,
        salePrice: 390,
        stockHolder: "Biochemistry",
        batchNumber: "GLU-2408",
        expiryDate: "2026-11-30",
        reorderLevel: 20,
      },
      {
        id: "invty-03",
        medicine: "Sysmex Cellpack DCL (20L)",
        stockQuantity: 8,
        purchasePrice: 3400,
        salePrice: 4200,
        stockHolder: "Hematology",
        batchNumber: "CP-2409",
        expiryDate: "2027-06-30",
        reorderLevel: 10,
      },
    ],
  });

  // 10. Instruments
  await prisma.instrument.createMany({
    data: [
      { id: "Ins-001", name: "Sysmex Hematology 1", manufacturer: "Sysmex", model: "XN-1000", serialNumber: "XN1000-2401-8821", department: "Hematology", instrumentType: "Hematology Analyzer", status: "Online", installationDate: "2024-03-15", lastMaintenance: "2026-07-20", nextMaintenance: "2026-09-20", connectionStatus: "Connected", lastCommunication: "2026-08-22T10:50:00Z", ipAddress: "192.168.1.101", location: "Hematology Lab, Bay 1", description: "5-part differential hematology analyzer with auto-loader" },
      { id: "Ins-002", name: "Beckman Chemistry 1", manufacturer: "Beckman Coulter", model: "AU5800", serialNumber: "AU5800-2311-4412", department: "Biochemistry", instrumentType: "Biochemistry Analyzer", status: "Online", installationDate: "2023-11-08", lastMaintenance: "2026-08-01", nextMaintenance: "2026-09-01", connectionStatus: "Connected", lastCommunication: "2026-08-22T10:52:00Z", ipAddress: "192.168.1.102", location: "Biochemistry Lab, Central", description: "High-throughput clinical chemistry analyzer" },
      { id: "Ins-003", name: "Roche Electrolyte 1", manufacturer: "Roche Diagnostics", model: "Cobas c501", serialNumber: "C501-2402-1108", department: "Electrolytes", instrumentType: "Electrolyte Analyzer", status: "Online", installationDate: "2024-01-22", lastMaintenance: "2026-07-28", nextMaintenance: "2026-09-28", connectionStatus: "Connected", lastCommunication: "2026-08-22T10:51:00Z", ipAddress: "192.168.1.103", location: "Biochemistry Lab, Bay 3", description: "ISE module for Na/K/Cl/CO2/Ca analysis" },
      { id: "Ins-004", name: "Urine Analyzer 1", manufacturer: "Siemens", model: "Clinitek Advantus", serialNumber: "CLN-2308-7734", department: "Urine", instrumentType: "Urine Analyzer", status: "Maintenance", installationDate: "2023-06-12", lastMaintenance: "2026-08-20", nextMaintenance: "2026-08-23", connectionStatus: "Disconnected", lastCommunication: "2026-08-20T18:15:00Z", ipAddress: "192.168.1.104", location: "Urine Lab", description: "Automated urine chemistry strip reader" },
      { id: "Ins-005", name: "ELISA Reader 1", manufacturer: "BioTek", model: "Synergy HTX", serialNumber: "SYN-2405-3322", department: "Serology", instrumentType: "ELISA Reader", status: "Online", installationDate: "2024-05-10", lastMaintenance: "2026-06-15", nextMaintenance: "2026-09-15", connectionStatus: "Connected", lastCommunication: "2026-08-22T09:30:00Z", ipAddress: "192.168.1.105", location: "Serology Lab", description: "Multi-mode microplate reader" },
      { id: "Ins-006", name: "PCR Thermal Cycler", manufacturer: "Applied Biosystems", model: "QuantStudio 5", serialNumber: "QS5-2403-9917", department: "Molecular", instrumentType: "PCR Machine", status: "Error", installationDate: "2024-04-02", lastMaintenance: "2026-05-10", nextMaintenance: "2026-08-10", connectionStatus: "Error", lastCommunication: "2026-08-21T22:40:00Z", ipAddress: "192.168.1.106", location: "Molecular Lab", description: "Real-time PCR system with 96-well block" },
      { id: "Ins-007", name: "Sysmex Hematology 2", manufacturer: "Sysmex", model: "XS-1000i", serialNumber: "XS1000-2210-5560", department: "Hematology", instrumentType: "Hematology Analyzer", status: "Offline", installationDate: "2022-10-05", lastMaintenance: "2026-04-18", nextMaintenance: "2026-07-18", connectionStatus: "Disconnected", lastCommunication: "2026-07-30T14:22:00Z", ipAddress: "192.168.1.107", location: "Hematology Lab, Bay 2", description: "3-part differential backup analyzer" },
      { id: "Ins-008", name: "Benchtop Centrifuge", manufacturer: "Eppendorf", model: "5810 R", serialNumber: "EPP-2301-2210", department: "Sample Processing", instrumentType: "Centrifuge", status: "Online", installationDate: "2023-02-14", lastMaintenance: "2026-06-30", nextMaintenance: "2026-10-30", connectionStatus: "Disconnected", ipAddress: "", location: "Processing Room", description: "Refrigerated benchtop centrifuge, 4x750 mL" },
    ],
  });

  // 11. Analyzer Orders, Results, Errors
  await prisma.analyzerResult.createMany({
    data: [
      { id: "ar-001", instrumentId: "Ins-001", instrumentName: "Sysmex XN-1000", receivedAt: new Date("2026-08-22T10:50:00Z"), sampleId: "smp-01", barcode: "LIS260822041", testCode: "HB", testName: "Hemoglobin", value: "11.2", unit: "g/dL", status: "Matched" },
      { id: "ar-002", instrumentId: "Ins-001", instrumentName: "Sysmex XN-1000", receivedAt: new Date("2026-08-22T10:50:00Z"), sampleId: "smp-01", barcode: "LIS260822041", testCode: "RBC", testName: "RBC Count", value: "4.1", unit: "M/uL", status: "Matched" },
      { id: "ar-003", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", receivedAt: new Date("2026-08-22T10:48:00Z"), sampleId: "smp-02", barcode: "LIS260822042", testCode: "GLU", testName: "Glucose", value: "105", unit: "mg/dL", status: "Matched" },
      { id: "ar-004", instrumentId: "Ins-003", instrumentName: "Roche Cobas c501", receivedAt: new Date("2026-08-22T10:45:00Z"), sampleId: "smp-01", barcode: "LIS260822041", testCode: "NA", testName: "Sodium", value: "140", unit: "mmol/L", status: "Matched" },
      { id: "ar-005", instrumentId: "Ins-003", instrumentName: "Roche Cobas c501", receivedAt: new Date("2026-08-22T10:45:00Z"), barcode: "LIS260822099", testCode: "K", testName: "Potassium", value: "4.8", unit: "mmol/L", status: "Unmatched" },
      { id: "ar-006", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", receivedAt: new Date("2026-08-22T10:30:00Z"), sampleId: "smp-02", barcode: "LIS260822042", testCode: "CRE", testName: "Creatinine", value: "0.85", unit: "mg/dL", status: "Matched" },
    ],
  });

  await prisma.analyzerOrder.createMany({
    data: [
      { id: "ao-001", instrumentId: "Ins-001", instrumentName: "Sysmex XN-1000", sentAt: new Date("2026-08-22T09:40:00Z"), sampleId: "smp-01", barcode: "LIS260822041", testCodes: ["CBC"], status: "Acknowledged" },
      { id: "ao-002", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", sentAt: new Date("2026-08-22T10:00:00Z"), sampleId: "smp-02", barcode: "LIS260822042", testCodes: ["LFT", "RFT", "LIPID"], status: "Acknowledged" },
      { id: "ao-003", instrumentId: "Ins-003", instrumentName: "Roche Cobas c501", sentAt: new Date("2026-08-22T10:10:00Z"), sampleId: "smp-01", barcode: "LIS260822041", testCodes: ["ELECT"], status: "Acknowledged" },
      { id: "ao-004", instrumentId: "Ins-001", instrumentName: "Sysmex XN-1000", sentAt: new Date("2026-08-22T10:55:00Z"), sampleId: "smp-03", barcode: "LIS260822047", testCodes: ["CBC"], status: "Sent" },
      { id: "ao-005", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", sentAt: new Date("2026-08-22T11:00:00Z"), sampleId: "smp-04", barcode: "LIS260822049", testCodes: ["GLU"], status: "Pending" },
    ],
  });

  await prisma.analyzerIntegrationError.createMany({
    data: [
      { id: "ae-001", instrumentId: "Ins-006", instrumentName: "QuantStudio 5", timestamp: new Date("2026-08-21T22:40:00Z"), errorType: "ConnectionError", message: "Lost connection to instrument: socket closed unexpectedly", acknowledged: false },
      { id: "ae-002", instrumentId: "Ins-006", instrumentName: "QuantStudio 5", timestamp: new Date("2026-08-22T08:15:00Z"), errorType: "ParseError", message: "Result packet 0x4E8C: unable to parse channel data at offset 128", acknowledged: false },
      { id: "ae-003", instrumentId: "Ins-004", instrumentName: "Clinitek Advantus", timestamp: new Date("2026-08-20T06:02:00Z"), errorType: "Maintenance", message: "Instrument entered maintenance mode; orders held", acknowledged: true },
    ],
  });

  // 12. Quality Control Parameters
  const qcParams = [
    { id: "qcp-0N", analyte: "Hemoglobin", instrumentId: "Ins-001", instrumentName: "Sysmex XN-1000", controlLevel: "Normal", mean: 13.5, sd: 0.8, acceptableMin: 11.1, acceptableMax: 15.9, unit: "g/dL", lotNumber: "HB-N-2408", effectiveDate: "2026-08-01", active: true },
    { id: "qcp-0L", analyte: "Hemoglobin", instrumentId: "Ins-001", instrumentName: "Sysmex XN-1000", controlLevel: "Low", mean: 8.2, sd: 0.5, acceptableMin: 6.7, acceptableMax: 9.7, unit: "g/dL", lotNumber: "HB-L-2408", effectiveDate: "2026-08-01", active: true },
    { id: "qcp-0H", analyte: "Hemoglobin", instrumentId: "Ins-001", instrumentName: "Sysmex XN-1000", controlLevel: "High", mean: 18.4, sd: 1.0, acceptableMin: 15.4, acceptableMax: 21.4, unit: "g/dL", lotNumber: "HB-H-2408", effectiveDate: "2026-08-01", active: true },
    { id: "qcp-1N", analyte: "Glucose", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", controlLevel: "Normal", mean: 95, sd: 5, acceptableMin: 80, acceptableMax: 110, unit: "mg/dL", lotNumber: "GLU-N-2408", effectiveDate: "2026-08-01", active: true },
    { id: "qcp-1H", analyte: "Glucose", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", controlLevel: "High", mean: 320, sd: 15, acceptableMin: 275, acceptableMax: 365, unit: "mg/dL", lotNumber: "GLU-H-2408", effectiveDate: "2026-08-01", active: true },
    { id: "qcp-2N", analyte: "Sodium", instrumentId: "Ins-003", instrumentName: "Roche Cobas c501", controlLevel: "Normal", mean: 140, sd: 2, acceptableMin: 134, acceptableMax: 146, unit: "mmol/L", lotNumber: "NA-N-2408", effectiveDate: "2026-08-01", active: true },
    { id: "qcp-3N", analyte: "Potassium", instrumentId: "Ins-003", instrumentName: "Roche Cobas c501", controlLevel: "Normal", mean: 4.2, sd: 0.3, acceptableMin: 3.3, acceptableMax: 5.1, unit: "mmol/L", lotNumber: "K-N-2408", effectiveDate: "2026-08-01", active: true },
    { id: "qcp-4N", analyte: "Cholesterol", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", controlLevel: "Normal", mean: 185, sd: 12, acceptableMin: 149, acceptableMax: 221, unit: "mg/dL", lotNumber: "CHOL-N-2408", effectiveDate: "2026-08-01", active: true },
    { id: "qcp-5N", analyte: "Creatinine", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", controlLevel: "Normal", mean: 0.9, sd: 0.08, acceptableMin: 0.66, acceptableMax: 1.14, unit: "mg/dL", lotNumber: "CRE-N-2408", effectiveDate: "2026-08-01", active: true },
  ];

  await prisma.qCParameter.createMany({ data: qcParams });

  // Generate realistic QC Runs for each parameter
  const now = new Date("2026-08-22T10:00:00Z");
  let runIndex = 1;
  const createdRuns: { id: string; runNumber: string; runDate: Date; analyte: string; instrumentId: string; instrumentName: string | null; controlLevel: string; parameterId: string; value: number; mean: number; sd: number; unit: string | null; status: string; zScore: number; operatorName: string }[] = [];

  for (const param of qcParams) {
    for (let i = 0; i < 8; i++) {
      const zScore = Number(((Math.sin(runIndex + i) * 1.5) + ((i % 3 === 0 ? 0.8 : -0.4))).toFixed(2));
      const value = Number((param.mean + zScore * param.sd).toFixed(2));
      let status = "Passed";
      if (Math.abs(zScore) > 3) status = "Failed";
      else if (Math.abs(zScore) > 2) status = "Warning";

      const runDate = new Date(now.getTime() - i * 6 * 3600 * 1000);
      createdRuns.push({
        id: `qcr-${runIndex.toString().padStart(3, "0")}`,
        runNumber: `QC-${260822000 + runIndex}`,
        runDate,
        analyte: param.analyte,
        instrumentId: param.instrumentId,
        instrumentName: param.instrumentName,
        controlLevel: param.controlLevel,
        parameterId: param.id,
        value,
        mean: param.mean,
        sd: param.sd,
        unit: param.unit,
        status,
        zScore,
        operatorName: ["R. Iyer", "S. Das", "A. Shah"][runIndex % 3],
      });
      runIndex++;
    }
  }

  await prisma.qCRun.createMany({ data: createdRuns });

  // QC Violations
  await prisma.qCViolation.createMany({
    data: [
      { id: "qcviol-001", qcRunId: createdRuns[0].id, runDate: new Date("2026-08-22T06:15:00Z"), analyte: "Glucose", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", controlLevel: "Normal", value: 112, expectedRange: "80 – 110 mg/dL", mean: 95, sd: 5, violationType: "1_2S", status: "Open", correctiveAction: "" },
      { id: "qcviol-002", qcRunId: createdRuns[1].id, runDate: new Date("2026-08-22T05:30:00Z"), analyte: "Potassium", instrumentId: "Ins-003", instrumentName: "Roche Cobas c501", controlLevel: "Normal", value: 5.3, expectedRange: "3.3 – 5.1 mmol/L", mean: 4.2, sd: 0.3, violationType: "1_3S", status: "Reviewed", reviewedBy: "Dr. Ananya Rao", reviewedAt: new Date("2026-08-22T06:45:00Z"), correctiveAction: "Recalibrated electrode; new control passed" },
      { id: "qcviol-003", qcRunId: createdRuns[2].id, runDate: new Date("2026-08-22T04:00:00Z"), analyte: "Hemoglobin", instrumentId: "Ins-001", instrumentName: "Sysmex XN-1000", controlLevel: "High", value: 21.9, expectedRange: "15.4 – 21.4 g/dL", mean: 18.4, sd: 1.0, violationType: "1_3S", status: "Open" },
      { id: "qcviol-004", qcRunId: createdRuns[3].id, runDate: new Date("2026-08-21T23:15:00Z"), analyte: "Creatinine", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", controlLevel: "Normal", value: 1.17, expectedRange: "0.66 – 1.14 mg/dL", mean: 0.9, sd: 0.08, violationType: "1_2S", status: "Resolved", reviewedBy: "S. Das", reviewedAt: new Date("2026-08-21T23:50:00Z"), resolvedAt: new Date("2026-08-22T00:30:00Z"), correctiveAction: "Repeated run after 10 min warm-up; values within limits" },
      { id: "qcviol-005", qcRunId: createdRuns[4].id, runDate: new Date("2026-08-21T20:00:00Z"), analyte: "Sodium", instrumentId: "Ins-003", instrumentName: "Roche Cobas c501", controlLevel: "Normal", value: 147, expectedRange: "134 – 146 mmol/L", mean: 140, sd: 2, violationType: "1_2S", status: "Acknowledged", reviewedBy: "R. Iyer", reviewedAt: new Date("2026-08-21T20:25:00Z"), correctiveAction: "Dilution verified; results within range on rerun" },
      { id: "qcviol-006", qcRunId: createdRuns[5].id, runDate: new Date("2026-08-21T18:45:00Z"), analyte: "Cholesterol", instrumentId: "Ins-002", instrumentName: "Beckman AU5800", controlLevel: "Normal", value: 230, expectedRange: "149 – 221 mg/dL", mean: 185, sd: 12, violationType: "2_2S", status: "Open" },
    ],
  });

  // 13. Settings
  await prisma.laboratorySetting.create({
    data: {
      id: "default",
      name: "BL Dignostic LIMS Reference Laboratory",
      address: "142, Healthcare Avenue, Bengaluru, Karnataka 560001, India",
      phone: "+91 80 4455 6677",
      email: "lab@pathologylis.example",
      website: "https://pathologylis.example",
      accreditation: "NABL Accredited ISO 15189:2012",
      licenseNumber: "KAR-LAB-2024-1482",
    },
  });

  await prisma.reportSetting.create({
    data: {
      id: "default",
      header: "BL Dignostic LIMS Reference Laboratory",
      footer: "This is a computer-generated report and does not require manual signature. Interpret clinically.",
      signature: "Dr. Ananya Rao, MD (Pathology)\nConsultant Pathologist",
      reportNumberingPrefix: "RPT-",
      reportNumberingNext: 260822020,
      dateFormat: "DD/MM/YYYY",
      showLogo: true,
      showSignatory: true,
      autoApprovePathologist: false,
    },
  });

  await prisma.referenceRange.createMany({
    data: [
      { id: "rr-001", testCode: "CBC", testName: "Complete Blood Count", parameter: "Hemoglobin", gender: "Male", ageMin: 18, ageMax: 65, minimum: 13.0, maximum: 17.0, unit: "g/dL", criticalLow: 7.0, criticalHigh: 20.0 },
      { id: "rr-002", testCode: "CBC", testName: "Complete Blood Count", parameter: "Hemoglobin", gender: "Female", ageMin: 18, ageMax: 65, minimum: 12.0, maximum: 15.5, unit: "g/dL", criticalLow: 6.5, criticalHigh: 19.0 },
      { id: "rr-003", testCode: "CBC", testName: "Complete Blood Count", parameter: "RBC Count", gender: "Both", minimum: 4.2, maximum: 5.9, unit: "M/uL" },
      { id: "rr-004", testCode: "GLU", testName: "Glucose (Fasting)", parameter: "Glucose", gender: "Both", ageMin: 18, minimum: 70, maximum: 110, unit: "mg/dL", criticalLow: 40, criticalHigh: 400 },
      { id: "rr-005", testCode: "LFT", testName: "Liver Function Test", parameter: "SGPT (ALT)", gender: "Both", minimum: 7, maximum: 55, unit: "U/L", criticalHigh: 400 },
      { id: "rr-006", testCode: "RFT", testName: "Renal Function Test", parameter: "Creatinine", gender: "Male", minimum: 0.6, maximum: 1.3, unit: "mg/dL", criticalHigh: 6.0 },
      { id: "rr-007", testCode: "RFT", testName: "Renal Function Test", parameter: "Creatinine", gender: "Female", minimum: 0.5, maximum: 1.1, unit: "mg/dL", criticalHigh: 5.5 },
      { id: "rr-008", testCode: "ELECT", testName: "Electrolyte Panel", parameter: "Sodium", gender: "Both", minimum: 135, maximum: 145, unit: "mmol/L", criticalLow: 120, criticalHigh: 160 },
      { id: "rr-009", testCode: "ELECT", testName: "Electrolyte Panel", parameter: "Potassium", gender: "Both", minimum: 3.5, maximum: 5.1, unit: "mmol/L", criticalLow: 2.5, criticalHigh: 6.5 },
      { id: "rr-010", testCode: "LIPID", testName: "Lipid Profile", parameter: "Total Cholesterol", gender: "Both", minimum: 100, maximum: 200, unit: "mg/dL", criticalHigh: 350 },
    ],
  });

  await prisma.unitDefinition.createMany({
    data: [
      { id: "u-001", code: "g/dL", name: "grams per deciliter", category: "Hematology" },
      { id: "u-002", code: "mg/dL", name: "milligrams per deciliter", category: "Biochemistry" },
      { id: "u-003", code: "mmol/L", name: "millimoles per liter", category: "Electrolytes" },
      { id: "u-004", code: "mEq/L", name: "milliequivalents per liter", category: "Electrolytes" },
      { id: "u-005", code: "U/L", name: "units per liter", category: "Enzymes" },
      { id: "u-006", code: "M/uL", name: "millions per microliter", category: "Hematology" },
      { id: "u-007", code: "K/uL", name: "thousands per microliter", category: "Hematology" },
      { id: "u-008", code: "%", name: "percent", category: "General" },
      { id: "u-009", code: "ng/mL", name: "nanograms per milliliter", category: "Immunology" },
      { id: "u-010", code: "pg/mL", name: "picograms per milliliter", category: "Immunology" },
    ],
  });

  await prisma.notificationSetting.create({
    data: {
      id: "default",
      criticalResultAlerts: true,
      pendingReportAlerts: true,
      qcAlerts: true,
      inventoryAlerts: true,
      appointmentReminders: true,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
    },
  });

  await prisma.systemPreference.create({
    data: {
      id: "default",
      timezone: "Asia/Kolkata",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12h",
      language: "English",
      theme: "light",
      defaultLandingPage: "/dashboard",
      resultsPerPage: 25,
    },
  });

  // 14. Audit Activity
  await prisma.auditActivity.createMany({
    data: [
      { id: "a1", type: "Critical result", subject: "Maya Srinivasan", detail: "Potassium 6.8 mmol/L flagged", time: "8 min ago", createdAt: new Date(Date.now() - 8 * 60000) },
      { id: "a2", type: "Report approved", subject: "RPT-260822-018", detail: "CBC approved by Dr. Rao", time: "22 min ago", createdAt: new Date(Date.now() - 22 * 60000) },
      { id: "a3", type: "Test completed", subject: "LIS-260822-044", detail: "Lipid profile completed", time: "36 min ago", createdAt: new Date(Date.now() - 36 * 60000) },
      { id: "a4", type: "Sample collected", subject: "LIS-260822-047", detail: "Arjun Mehta · EDTA", time: "48 min ago", createdAt: new Date(Date.now() - 48 * 60000) },
      { id: "a5", type: "Patient registered", subject: "Neha Kulkarni", detail: "PT-24026 registered", time: "1 hr ago", createdAt: new Date(Date.now() - 60 * 60000) },
    ],
  });

  // 15. Seed Test Master Catalog
  await seedTestMasters();

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
