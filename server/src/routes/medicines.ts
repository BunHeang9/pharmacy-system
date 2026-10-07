import { Router, raw } from 'express'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { prisma } from '../prisma'
import { requireAuth, requireRole, NOT_CLERK } from '../middleware/auth'

import { asyncHandler } from '../lib/asyncHandler'

export const medicinesRouter = Router()
medicinesRouter.use(requireAuth)

const createSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().min(1),
  brand: z.string().optional().default(""),
  categoryId: z.string().min(1),
  supplierId: z.string().nullable().optional(),
  form: z.string().optional().default(""),
  strength: z.string().optional().default(""),
  unit: z.string().optional().default(""),
  packUnit: z.string().optional().default(""),
  unitsPerPack: z.coerce.number().int().min(1).default(1),
  packPurchasePrice: z.coerce.number().min(0).nullable().optional(),
  packSellingPrice: z.coerce.number().min(0).nullable().optional(),
  barcode: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  manufacturer: z.string().optional().default(""),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  prescriptionRequired: z.boolean().optional().default(false),
});
const updateSchema = createSchema.partial();

const toDto = (m: any) => {
  const batches: { quantity: number; expiryDate: Date }[] = m.batches ?? [];
  const stock = batches.reduce((s, b) => s + b.quantity, 0);
  const status =
    stock === 0
      ? "Out of Stock"
      : stock < m.minStock
        ? "Low Stock"
        : "In Stock";
  const nextExpiry = batches[0]?.expiryDate
    ? batches[0].expiryDate.toISOString().slice(0, 10)
    : null;

  return {
    id: m.id,
    name: m.name,
    generic: m.genericName,
    brand: m.brand,
    category: m.category?.name ?? null,
    categoryId: m.categoryId,
    supplier: m.supplier?.name ?? null,
    supplierId: m.supplierId,
    form: m.form,
    strength: m.strength,
    unit: m.unit,
    packUnit: m.packUnit,
    unitsPerPack: m.unitsPerPack,
    packPurchasePrice:
      m.packPurchasePrice == null ? null : Number(m.packPurchasePrice),
    packSellingPrice:
      m.packSellingPrice == null ? null : Number(m.packSellingPrice),
    barcode: m.barcode,
    sku: m.sku,
    manufacturer: m.manufacturer,
    purchasePrice: Number(m.purchasePrice),
    sellingPrice: Number(m.sellingPrice),
    taxRate: Number(m.taxRate),
    minStock: m.minStock,
    prescription: m.prescriptionRequired,
    stock,
    status,
    nextExpiry,
    batchCount: batches.length,
    imageUrl: m.imageUrl,
  };
};
const imageDirectory = path.join(
  process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads"),
  "medicines",
);
const imageTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
// batches ຮຽງໝົດອາຍຸໄວທີ່ສຸດກ່ອນ — batches[0] ຄື next expiry ຕາມລຳດັບ FEFO
const withRels = {
  category: true,
  supplier: true,
  batches: {
    where: { quantity: { gt: 0 } },
    orderBy: { expiryDate: "asc" as const },
  },
} as const;

medicinesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.medicine.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: withRels,
    });
    res.json(rows.map(toDto));
  }),
);

medicinesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const m = await prisma.medicine.findUnique({
      where: { id: req.params.id },
      include: withRels,
    });
    if (!m || !m.isActive) {
      res.status(404).json({ code: "NOT_FOUND", error: "Not found" });
      return;
    }
    res.json(toDto(m));
  }),
);

medicinesRouter.post(
  "/:id/image",
  requireRole(...NOT_CLERK),
  raw({ type: Object.keys(imageTypes), limit: "5mb" }),
  asyncHandler(async (req, res) => {
    const contentType = req.headers["content-type"] ?? "";
    const extension = imageTypes[contentType];
    if (!extension || !Buffer.isBuffer(req.body)) {
      res
        .status(400)
        .json({ code: "INVALID_IMAGE", error: "Unsupported image" });
      return;
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id: req.params.id },
    });
    if (!medicine || !medicine.isActive) {
      res.status(404).json({ code: "NOT_FOUND", error: "Medicine not found" });
      return;
    }

    const filename = `${randomUUID()}${extension}`;
    await mkdir(imageDirectory, { recursive: true });
    await writeFile(path.join(imageDirectory, filename), req.body);

    let updated;
    try {
      updated = await prisma.medicine.update({
        where: { id: medicine.id },
        data: { imageUrl: `/uploads/medicines/${filename}` },
        include: withRels,
      });
    } catch (error) {
      await rm(path.join(imageDirectory, filename), { force: true });
      throw error;
    }

    if (medicine.imageUrl?.startsWith("/uploads/medicines/")) {
      await rm(path.join(imageDirectory, path.basename(medicine.imageUrl)), {
        force: true,
      });
    }
    res.json(toDto(updated));
  }),
);

medicinesRouter.post(
  "/",
  requireRole(...NOT_CLERK),
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: "INVALID_INPUT",
        error: "Invalid data",
        details: parsed.error.issues,
      });
      return;
    }
    const d = parsed.data;
    const m = await prisma.medicine.create({
      data: {
        name: d.name,
        genericName: d.genericName,
        brand: d.brand,
        categoryId: d.categoryId,
        supplierId: d.supplierId ?? null,
        form: d.form,
        strength: d.strength,
        unit: d.unit,
        packUnit: d.packUnit,
        unitsPerPack: d.unitsPerPack,
        packPurchasePrice: d.packPurchasePrice ?? null,
        packSellingPrice: d.packSellingPrice ?? null,
        barcode: d.barcode || null,
        sku: d.sku || null,
        manufacturer: d.manufacturer,
        purchasePrice: d.purchasePrice,
        sellingPrice: d.sellingPrice,
        taxRate: d.taxRate,
        minStock: d.minStock,
        prescriptionRequired: d.prescriptionRequired,
      },
      include: withRels,
    });
    res.status(201).json(toDto(m));
  }),
);

medicinesRouter.put('/:id', requireRole(...NOT_CLERK), asyncHandler(async (req, res) => {

  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ code: 'INVALID_INPUT', error: 'Invalid data' }); return }
  const m = await prisma.medicine.update({
    where: { id: req.params.id }, data: parsed.data, include: withRels,
  })
  res.json(toDto(m))
}))

medicinesRouter.delete('/:id', requireRole(...NOT_CLERK), asyncHandler(async (req, res) => {
  await prisma.medicine.update({ where: { id: req.params.id }, data: { isActive: false } })
  res.json({ ok: true })
}))

