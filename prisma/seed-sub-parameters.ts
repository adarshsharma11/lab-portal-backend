import { PrismaClient } from "@prisma/client";

export const ALIGARH_FRANCHISE_ID = "95e74dde-fec7-419c-87b1-8722721772f4";

// 1. DEFAULT / GLOBAL SUB-PARAMETERS (Used by Varanasi and any standard franchise)
export const DEFAULT_TEST_SUB_PARAMETERS_DATA = [
  // Hematology - CBC
  { department: "Hematology", mainParameter: "CBC", subParameter: "Hb", unit: "g/dL", referenceRange: "13.0 - 17.0", defaultValue: "14.2", orderIndex: 1, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "TLC", unit: "10^3/µL", referenceRange: "4.0 - 10.0", defaultValue: "6.8", orderIndex: 2, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "DLC", unit: "%", referenceRange: "Differential Leucocyte Count", defaultValue: "Normal", orderIndex: 3, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Neutrophils", unit: "%", referenceRange: "40 - 80", defaultValue: "62.0", orderIndex: 4, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Lymphocytes", unit: "%", referenceRange: "20 - 40", defaultValue: "28.5", orderIndex: 5, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Eosinophils", unit: "%", referenceRange: "1 - 6", defaultValue: "3.0", orderIndex: 6, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Monocytes", unit: "%", referenceRange: "2 - 10", defaultValue: "6.0", orderIndex: 7, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Basophils", unit: "%", referenceRange: "0 - 2", defaultValue: "0.5", orderIndex: 8, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "ESR", unit: "mm/hr", referenceRange: "0 - 15", defaultValue: "8", orderIndex: 9, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "RBC", unit: "10^6/µL", referenceRange: "4.50 - 5.50", defaultValue: "4.85", orderIndex: 10, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "MCH", unit: "pg", referenceRange: "27.0 - 32.0", defaultValue: "29.5", orderIndex: 11, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "MCHC", unit: "g/dL", referenceRange: "31.5 - 34.5", defaultValue: "33.2", orderIndex: 12, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "MCV", unit: "fL", referenceRange: "83.0 - 101.0", defaultValue: "88.0", orderIndex: 13, franchiseId: null },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Platelet", unit: "10^3/µL", referenceRange: "150 - 410", defaultValue: "245", orderIndex: 14, franchiseId: null },

  // Bio Chemistry - LFT
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Bilirubin-total", unit: "mg/dL", referenceRange: "0.3 - 1.2", defaultValue: "0.75", orderIndex: 1, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Bilirubin-Direct", unit: "mg/dL", referenceRange: "0.0 - 0.2", defaultValue: "0.15", orderIndex: 2, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Bilirubin- Indirect", unit: "mg/dL", referenceRange: "0.0 - 0.8", defaultValue: "0.60", orderIndex: 3, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Total Protein", unit: "g/dL", referenceRange: "6.6 - 8.3", defaultValue: "7.30", orderIndex: 4, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Albumin", unit: "g/dL", referenceRange: "3.5 - 5.2", defaultValue: "4.20", orderIndex: 5, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Globulin", unit: "g/dL", referenceRange: "3.0 - 4.2", defaultValue: "3.10", orderIndex: 6, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "A/G Ratio", unit: "Ratio", referenceRange: "1.2 - 2.5", defaultValue: "1.35", orderIndex: 7, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "SGOT", unit: "U/L", referenceRange: "3 - 50", defaultValue: "24.0", orderIndex: 8, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "SGPT", unit: "U/L", referenceRange: "3 - 50", defaultValue: "22.0", orderIndex: 9, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "ALP", unit: "U/L", referenceRange: "43 - 115", defaultValue: "76.0", orderIndex: 10, franchiseId: null },

  // Bio Chemistry - KFT
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "sugar- R", unit: "mg/dL", referenceRange: "70 - 140", defaultValue: "110.0", orderIndex: 1, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "UREA", unit: "mg/dL", referenceRange: "17 - 43", defaultValue: "26.0", orderIndex: 2, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "CREATININE", unit: "mg/dL", referenceRange: "0.7 - 1.4", defaultValue: "0.92", orderIndex: 3, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "URIC ACID", unit: "mg/dL", referenceRange: "3.5 - 7.2", defaultValue: "5.4", orderIndex: 4, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "SODIUM", unit: "mmol/L", referenceRange: "135 - 145", defaultValue: "140.0", orderIndex: 5, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "POTASSIUM", unit: "mmol/L", referenceRange: "3.5 - 5.1", defaultValue: "4.2", orderIndex: 6, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "CHOLORIDE", unit: "mmol/L", referenceRange: "98 - 107", defaultValue: "102.0", orderIndex: 7, franchiseId: null },

  // Bio Chemistry - LIPID PROFILE
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "CHOLESTROL", unit: "mg/dL", referenceRange: "< 200", defaultValue: "165.0", orderIndex: 1, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "HDL", unit: "mg/dL", referenceRange: "40 - 60", defaultValue: "48.0", orderIndex: 2, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "LDL", unit: "mg/dL", referenceRange: "< 100", defaultValue: "91.4", orderIndex: 3, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "VLDL", unit: "mg/dL", referenceRange: "< 30", defaultValue: "25.6", orderIndex: 4, franchiseId: null },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "TRIGLYCERIDE", unit: "mg/dL", referenceRange: "< 150", defaultValue: "128.0", orderIndex: 5, franchiseId: null },
];

// 2. ALIGARH FRANCHISE SPECIFIC SUB-PARAMETERS
export const ALIGARH_TEST_SUB_PARAMETERS_DATA = [
  // LFT Parameters (Aligarh)
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "S.BILIRUBIN (TOTAL)", unit: "mg %", referenceRange: "0.1 - 1.0", defaultValue: "0.6", orderIndex: 1 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "CONJUGATED (DIRECT)", unit: "mg %", referenceRange: "0.0 - 0.25", defaultValue: "0.15", orderIndex: 2 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "UNCONJUGATED (INDIRECT)", unit: "mg %", referenceRange: "0.0 - 0.75", defaultValue: "0.45", orderIndex: 3 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "SGOT", unit: "U/L", referenceRange: "10.0 - 50.0", defaultValue: "24.0", orderIndex: 4 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "SGPT", unit: "U/L", referenceRange: "10.0 - 50.0", defaultValue: "22.0", orderIndex: 5 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "S.ALKALINE PHOSPHATASE", unit: "U/L", referenceRange: "37 - 143", defaultValue: "76.0", orderIndex: 6 },

  // RFT Parameters (Aligarh)
  { department: "Bio Chemistry", mainParameter: "RFT", subParameter: "BLOOD UREA", unit: "mg %", referenceRange: "10.0 - 50.0", defaultValue: "26.0", orderIndex: 1 },
  { department: "Bio Chemistry", mainParameter: "RFT", subParameter: "SERUM CREATININE", unit: "mg %", referenceRange: "0.6 - 1.2", defaultValue: "0.9", orderIndex: 2 },
  { department: "Bio Chemistry", mainParameter: "RFT", subParameter: "SERUM URIC ACID", unit: "mg %", referenceRange: "2.5 - 6.5", defaultValue: "4.8", orderIndex: 3 },
  { department: "Bio Chemistry", mainParameter: "RFT", subParameter: "Serum Sodium", unit: "mmol /L", referenceRange: "135.0 - 150.0", defaultValue: "140.0", orderIndex: 4 },
  { department: "Bio Chemistry", mainParameter: "RFT", subParameter: "S. Potassium", unit: "mmol /L", referenceRange: "3.5 - 5.5", defaultValue: "4.2", orderIndex: 5 },
  { department: "Bio Chemistry", mainParameter: "RFT", subParameter: "IONISED CALCIUM", unit: "meq /L", referenceRange: "1.0 - 2.3", defaultValue: "1.6", orderIndex: 6 },

  // KFT Parameters alias (Aligarh)
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "BLOOD UREA", unit: "mg %", referenceRange: "10.0 - 50.0", defaultValue: "26.0", orderIndex: 1 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "SERUM CREATININE", unit: "mg %", referenceRange: "0.6 - 1.2", defaultValue: "0.9", orderIndex: 2 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "SERUM URIC ACID", unit: "mg %", referenceRange: "2.5 - 6.5", defaultValue: "4.8", orderIndex: 3 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "Serum Sodium", unit: "mmol /L", referenceRange: "135.0 - 150.0", defaultValue: "140.0", orderIndex: 4 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "S. Potassium", unit: "mmol /L", referenceRange: "3.5 - 5.5", defaultValue: "4.2", orderIndex: 5 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "IONISED CALCIUM", unit: "meq /L", referenceRange: "1.0 - 2.3", defaultValue: "1.6", orderIndex: 6 },

  // LIPID PROFILE Parameters (Aligarh)
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "S. CHOLESTEROL", unit: "mg %", referenceRange: "120.0 - 200.0", defaultValue: "165.0", orderIndex: 1 },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "S.TRIGLYCCERIDES", unit: "mg%", referenceRange: "60.0 - 200.0", defaultValue: "128.0", orderIndex: 2 },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "HDL CHOLESTEROL", unit: "mg%", referenceRange: "35.0 - 95.0", defaultValue: "48.0", orderIndex: 3 },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "V L D L CHOLESTEROL", unit: "mg%", referenceRange: "5.0 - 40.0", defaultValue: "25.6", orderIndex: 4 },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "LDL CHOLESTEROL", unit: "mg%", referenceRange: "50.0 - 190.0", defaultValue: "91.4", orderIndex: 5 },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "TOTAL / HDL CHOLESTEROL RATIO", unit: "", referenceRange: "0.00 - 4.9", defaultValue: "3.44", orderIndex: 6 },

  // THYROID PROFILE Parameters (Aligarh)
  { department: "Bio Chemistry", mainParameter: "THYROID PROFILE", subParameter: "T3", unit: "nmol/l", referenceRange: "0.6 - 2.0", defaultValue: "1.2", orderIndex: 1 },
  { department: "Bio Chemistry", mainParameter: "THYROID PROFILE", subParameter: "T4", unit: "nmol/l", referenceRange: "60 - 155", defaultValue: "95.0", orderIndex: 2 },
  { department: "Bio Chemistry", mainParameter: "THYROID PROFILE", subParameter: "TSH", unit: "ulU/ml", referenceRange: "0.38 - 5.50", defaultValue: "2.10", orderIndex: 3 },
];

export async function seedTestSubParameters(prismaClient?: PrismaClient) {
  const prisma = prismaClient || new PrismaClient();
  console.log("Seeding Test Sub-Parameters...");

  // Find Aligarh franchise if exists in database
  const aligarhFranchise = await prisma.franchise.findFirst({
    where: {
      OR: [
        { id: ALIGARH_FRANCHISE_ID },
        { code: "ALG-02" },
        { email: "akshataligarh@botlif.com" },
        { name: { contains: "Aligarh", mode: "insensitive" } },
      ],
    },
  });

  const aligarhId = aligarhFranchise?.id || ALIGARH_FRANCHISE_ID;

  // Clear existing sub-parameters
  await prisma.testSubParameter.deleteMany({});

  // 1. Insert global default records
  await prisma.testSubParameter.createMany({
    data: DEFAULT_TEST_SUB_PARAMETERS_DATA,
  });

  // 2. Insert Aligarh franchise specific records if franchise exists or with configured ID
  const aligarhRecords = ALIGARH_TEST_SUB_PARAMETERS_DATA.map(item => ({
    ...item,
    franchiseId: aligarhId,
  }));

  try {
    await prisma.testSubParameter.createMany({
      data: aligarhRecords,
    });
  } catch (err) {
    console.warn("Could not attach franchiseId directly to Aligarh sub-parameters:", err);
  }

  const count = await prisma.testSubParameter.count();
  console.log(`Successfully seeded ${count} TestSubParameter records (Default + Aligarh)!`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedTestSubParameters(prisma)
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error("Error seeding sub-parameters:", err);
      prisma.$disconnect();
      process.exit(1);
    });
}
