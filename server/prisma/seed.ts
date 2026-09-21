import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const categories = [
  { name: 'Antibiotics', description: 'Medicines that fight bacterial infections', icon: '🦠' },
  { name: 'Pain Relief', description: 'Analgesics and anti-inflammatory medicines', icon: '💊' },
  { name: 'Vitamins', description: 'Dietary supplements and vitamins', icon: '🌿' },
  { name: 'Diabetes', description: 'Medicines for diabetes management', icon: '💉' },
  { name: 'Cardiovascular', description: 'Heart and blood pressure medicines', icon: '❤️' },
  { name: 'Cold & Flu', description: 'Medicines for cold, flu and fever', icon: '🤧' },
  { name: 'Allergy', description: 'Antihistamines and allergy medicines', icon: '🌸' },
  { name: 'Digestive', description: 'Medicines for digestive health', icon: '🫁' },
  { name: 'Skin Care', description: 'Topical medicines and skin treatments', icon: '🧴' },
  { name: 'Baby Care', description: 'Medicines and supplements for infants', icon: '👶' },
  { name: 'Respiratory', description: 'Inhalers and respiratory medicines', icon: '🫀' },
]

// ລາຄາເປັນເງິນກີບລາວ (₭) — ບໍ່ໃຊ້ຈຸດທົດສະນິຍົມ, ອັດຕາປະມານ 1 USD ≈ 20,000 LAK
const suppliers = [
  { name: 'MedSupply Co.', contact: 'John Anderson', phone: '+1 555-0101', email: 'john@medsupply.com', address: '123 Pharma St, New York, NY 10001', balance: 64_000_000 },
  { name: 'PharmaDist Ltd.', contact: 'Sarah Johnson', phone: '+1 555-0102', email: 'sarah@pharmadist.com', address: '456 Medical Ave, Los Angeles, CA 90001', balance: 0 },
  { name: 'GlobalMed Inc.', contact: 'Michael Lee', phone: '+1 555-0103', email: 'michael@globalmed.com', address: '789 Health Blvd, Chicago, IL 60601', balance: 30_000_000 },
  { name: 'VitaSupply Co.', contact: 'Emily Chen', phone: '+1 555-0104', email: 'emily@vitasupply.com', address: '321 Wellness Way, Houston, TX 77001', balance: 0 },
  { name: 'BioMed Solutions', contact: 'Robert Wilson', phone: '+1 555-0105', email: 'robert@biomed.com', address: '654 Bio Park, Phoenix, AZ 85001', balance: 16_000_000 },
]

const medicines = [
  { name: 'Amoxicillin', genericName: 'Amoxicillin Trihydrate', category: 'Antibiotics', brand: 'Amoxil', form: 'Capsule', strength: '500mg', unit: 'Capsule', purchasePrice: 170_000, sellingPrice: 299_800, minStock: 50, barcode: '8901030865068', sku: 'AMX-500-CAP', manufacturer: 'GSK', supplier: 'MedSupply Co.', prescriptionRequired: true },
  { name: 'Paracetamol', genericName: 'Acetaminophen', category: 'Pain Relief', brand: 'Panadol', form: 'Tablet', strength: '500mg', unit: 'Tablet', purchasePrice: 44_000, sellingPrice: 99_800, minStock: 100, barcode: '8901030865069', sku: 'PCM-500-TAB', manufacturer: 'GSK', supplier: 'PharmaDist Ltd.', prescriptionRequired: false },
  { name: 'Metformin HCl', genericName: 'Metformin Hydrochloride', category: 'Diabetes', brand: 'Glucophage', form: 'Tablet', strength: '850mg', unit: 'Tablet', purchasePrice: 116_000, sellingPrice: 230_000, minStock: 60, barcode: '8901030865070', sku: 'MFM-850-TAB', manufacturer: 'Merck', supplier: 'MedSupply Co.', prescriptionRequired: true },
  { name: 'Atorvastatin', genericName: 'Atorvastatin Calcium', category: 'Cardiovascular', brand: 'Lipitor', form: 'Tablet', strength: '40mg', unit: 'Tablet', purchasePrice: 240_000, sellingPrice: 455_000, minStock: 30, barcode: '8901030865071', sku: 'ATV-40-TAB', manufacturer: 'Pfizer', supplier: 'GlobalMed Inc.', prescriptionRequired: true },
  { name: 'Cetirizine HCl', genericName: 'Cetirizine Hydrochloride', category: 'Allergy', brand: 'Zyrtec', form: 'Tablet', strength: '10mg', unit: 'Tablet', purchasePrice: 90_000, sellingPrice: 179_800, minStock: 40, barcode: '8901030865072', sku: 'CTZ-10-TAB', manufacturer: 'UCB Pharma', supplier: 'PharmaDist Ltd.', prescriptionRequired: false },
  { name: 'Omeprazole', genericName: 'Omeprazole', category: 'Digestive', brand: 'Prilosec', form: 'Capsule', strength: '20mg', unit: 'Capsule', purchasePrice: 124_000, sellingPrice: 240_000, minStock: 50, barcode: '8901030865073', sku: 'OMP-20-CAP', manufacturer: 'AstraZeneca', supplier: 'MedSupply Co.', prescriptionRequired: false },
  { name: 'Vitamin C', genericName: 'Ascorbic Acid', category: 'Vitamins', brand: 'Celin', form: 'Tablet', strength: '500mg', unit: 'Tablet', purchasePrice: 36_000, sellingPrice: 79_800, minStock: 100, barcode: '8901030865074', sku: 'VTC-500-TAB', manufacturer: 'Pfizer', supplier: 'VitaSupply Co.', prescriptionRequired: false },
  { name: 'Amlodipine', genericName: 'Amlodipine Besylate', category: 'Cardiovascular', brand: 'Norvasc', form: 'Tablet', strength: '5mg', unit: 'Tablet', purchasePrice: 148_000, sellingPrice: 290_000, minStock: 40, barcode: '8901030865075', sku: 'AML-5-TAB', manufacturer: 'Pfizer', supplier: 'GlobalMed Inc.', prescriptionRequired: true },
  { name: 'Salbutamol', genericName: 'Albuterol Sulfate', category: 'Respiratory', brand: 'Ventolin', form: 'Inhaler', strength: '100mcg', unit: 'Puff', purchasePrice: 300_000, sellingPrice: 579_800, minStock: 30, barcode: '8901030865076', sku: 'SLB-100-INH', manufacturer: 'GSK', supplier: 'PharmaDist Ltd.', prescriptionRequired: true },
  { name: 'Ibuprofen', genericName: 'Ibuprofen', category: 'Pain Relief', brand: 'Brufen', form: 'Tablet', strength: '400mg', unit: 'Tablet', purchasePrice: 62_000, sellingPrice: 130_000, minStock: 80, barcode: '8901030865077', sku: 'IBU-400-TAB', manufacturer: 'Abbott', supplier: 'MedSupply Co.', prescriptionRequired: false },
]


//This create function called main
async function main() {
    //upsert function mean if exists => update it , if not exist =>create it

  const branch = await prisma.branch.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', name: 'Bun Pharmacy', address: 'ນະຄອນຫຼວງວຽງຈັນ' },
  })

  const passwordHash = await hash('password', 10)
  await prisma.user.upsert({
    where: { email: 'admin@rxpharm.com' },
    update: {},
    create: {
      name: 'Dr. Amanda Foster',
      email: 'admin@rxpharm.com',
      passwordHash,
      role: 'SUPER_ADMIN',
      branchId: branch.id,
    },
  })
//catId to create JavaScript Map
//It purpose is to remember category name => Category ID
//This loop c "processes them one by one mean find from A => Z"
  const catId = new Map<string, string>()
  for (const c of categories) {
    const row = await prisma.category.upsert({ where: { name: c.name }, update: {}, create: c })
    catId.set(row.name, row.id)

  }
// catId.set(row.name, row.id)  use to save when prisma create 

  const supId = new Map<string, string>()
  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } })
    const row = existing ?? (await prisma.supplier.create({ data: s }))
    supId.set(row.name, row.id)
  }

  for (const m of medicines) {
    const { category, supplier, ...rest } = m
    await prisma.medicine.upsert({
      where: { barcode: rest.barcode },
      update: {},
      create: {
        ...rest,
        categoryId: catId.get(category)!,
        supplierId: supId.get(supplier) ?? null,
      },
    })
  }

  console.log('✅ Seed complete: 1 branch, 1 admin, 11 categories, 5 suppliers, 10 medicines')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
