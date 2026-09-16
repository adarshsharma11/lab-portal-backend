import { PrismaClient } from "@prisma/client";

export const TEST_SUB_PARAMETERS_DATA = [
  // 1. Hematology - CBC
  { department: "Hematology", mainParameter: "CBC", subParameter: "Hb", unit: "g/dL", referenceRange: "13.0 - 17.0", defaultValue: "14.2", orderIndex: 1 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "TLC", unit: "10^3/µL", referenceRange: "4.0 - 10.0", defaultValue: "6.8", orderIndex: 2 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "DLC", unit: "%", referenceRange: "Differential Leucocyte Count", defaultValue: "Normal", orderIndex: 3 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Neutrophils", unit: "%", referenceRange: "40 - 80", defaultValue: "62.0", orderIndex: 4 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Lymphocytes", unit: "%", referenceRange: "20 - 40", defaultValue: "28.5", orderIndex: 5 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Eosinophils", unit: "%", referenceRange: "1 - 6", defaultValue: "3.0", orderIndex: 6 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Monocytes", unit: "%", referenceRange: "2 - 10", defaultValue: "6.0", orderIndex: 7 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Basophils", unit: "%", referenceRange: "0 - 2", defaultValue: "0.5", orderIndex: 8 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "ESR", unit: "mm/hr", referenceRange: "0 - 15", defaultValue: "8", orderIndex: 9 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "RBC", unit: "10^6/µL", referenceRange: "4.50 - 5.50", defaultValue: "4.85", orderIndex: 10 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "MCH", unit: "pg", referenceRange: "27.0 - 32.0", defaultValue: "29.5", orderIndex: 11 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "MCHC", unit: "g/dL", referenceRange: "31.5 - 34.5", defaultValue: "33.2", orderIndex: 12 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "MCV", unit: "fL", referenceRange: "83.0 - 101.0", defaultValue: "88.0", orderIndex: 13 },
  { department: "Hematology", mainParameter: "CBC", subParameter: "Platelet", unit: "10^3/µL", referenceRange: "150 - 410", defaultValue: "245", orderIndex: 14 },

  // 2. Bio Chemistry - LFT
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Bilirubin-total", unit: "mg/dL", referenceRange: "0.3 - 1.2", defaultValue: "0.75", orderIndex: 1 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Bilirubin-Direct", unit: "mg/dL", referenceRange: "0.0 - 0.2", defaultValue: "0.15", orderIndex: 2 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Bilirubin- Indirect", unit: "mg/dL", referenceRange: "0.0 - 0.8", defaultValue: "0.60", orderIndex: 3 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Total Protein", unit: "g/dL", referenceRange: "6.6 - 8.3", defaultValue: "7.30", orderIndex: 4 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Albumin", unit: "g/dL", referenceRange: "3.5 - 5.2", defaultValue: "4.20", orderIndex: 5 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "Globulin", unit: "g/dL", referenceRange: "3.0 - 4.2", defaultValue: "3.10", orderIndex: 6 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "A/G Ratio", unit: "Ratio", referenceRange: "1.2 - 2.5", defaultValue: "1.35", orderIndex: 7 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "SGOT", unit: "U/L", referenceRange: "3 - 50", defaultValue: "24.0", orderIndex: 8 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "SGPT", unit: "U/L", referenceRange: "3 - 50", defaultValue: "22.0", orderIndex: 9 },
  { department: "Bio Chemistry", mainParameter: "LFT", subParameter: "ALP", unit: "U/L", referenceRange: "43 - 115", defaultValue: "76.0", orderIndex: 10 },

  // 3. Bio Chemistry - KFT
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "sugar- R", unit: "mg/dL", referenceRange: "70 - 140", defaultValue: "110.0", orderIndex: 1 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "UREA", unit: "mg/dL", referenceRange: "17 - 43", defaultValue: "26.0", orderIndex: 2 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "CREATININE", unit: "mg/dL", referenceRange: "0.7 - 1.4", defaultValue: "0.92", orderIndex: 3 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "URIC ACID", unit: "mg/dL", referenceRange: "3.5 - 7.2", defaultValue: "5.4", orderIndex: 4 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "SODIUM", unit: "mmol/L", referenceRange: "135 - 145", defaultValue: "140.0", orderIndex: 5 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "POTASSIUM", unit: "mmol/L", referenceRange: "3.5 - 5.1", defaultValue: "4.2", orderIndex: 6 },
  { department: "Bio Chemistry", mainParameter: "KFT", subParameter: "CHOLORIDE", unit: "mmol/L", referenceRange: "98 - 107", defaultValue: "102.0", orderIndex: 7 },

  // 4. Bio Chemistry - LIPID PROFILE
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "CHOLESTROL", unit: "mg/dL", referenceRange: "< 200", defaultValue: "165.0", orderIndex: 1 },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "HDL", unit: "mg/dL", referenceRange: "40 - 60", defaultValue: "48.0", orderIndex: 2 },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "LDL", unit: "mg/dL", referenceRange: "< 100", defaultValue: "91.4", orderIndex: 3 },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "VLDL", unit: "mg/dL", referenceRange: "< 30", defaultValue: "25.6", orderIndex: 4 },
  { department: "Bio Chemistry", mainParameter: "LIPID PROFILE", subParameter: "TRIGLYCERIDE", unit: "mg/dL", referenceRange: "< 150", defaultValue: "128.0", orderIndex: 5 },
];

export async function seedTestSubParameters(prismaClient?: PrismaClient) {
  const prisma = prismaClient || new PrismaClient();
  console.log("Seeding Test Sub-Parameters (35 items)...");

  // Clear existing sub-parameters
  await prisma.testSubParameter.deleteMany({});

  // Insert batch
  await prisma.testSubParameter.createMany({
    data: TEST_SUB_PARAMETERS_DATA,
  });

  const count = await prisma.testSubParameter.count();
  console.log(`Successfully seeded ${count} TestSubParameter records!`);
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
