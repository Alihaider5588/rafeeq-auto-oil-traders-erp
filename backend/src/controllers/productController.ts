import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { MovementType, Role } from '../types/enums';
import { Prisma } from '@prisma/client';

const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU is required'),
  categoryId: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  unitId: z.string().min(1, 'Base unit is required'),
  primaryUnitId: z.string().optional().nullable(),
  conversionFactor: z.number().min(1).max(500).default(1),
  purchasePrice: z.number().min(0, 'Purchase price must be positive'),
  salePrice: z.number().min(0, 'Sale price must be positive'),
  wholesalePrice: z.number().min(0).default(0),
  minimumStockLevel: z.number().min(0).default(5),
  openingStock: z.number().min(0).default(0),
  description: z.string().optional().nullable(),
  specifications: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  showOnWebsite: z.boolean().default(false),
  showInCatalog: z.boolean().default(true),
  showPublicPrice: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const getProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, categoryId, brand, lowStock, showOnWebsite, showInCatalog, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ProductWhereInput = {};

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { brand: { contains: q } },
      ];
    }

    if (categoryId && typeof categoryId === 'string') where.categoryId = categoryId;
    if (brand && typeof brand === 'string') where.brand = brand;
    if (showOnWebsite === 'true') where.showOnWebsite = true;
    if (showInCatalog === 'true') where.showInCatalog = true;

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          unit: true,
          primaryUnit: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
    ]);

    let filteredProducts = products;
    if (lowStock === 'true') {
      filteredProducts = products.filter(
        (p) => Number(p.currentStock) <= Number(p.minimumStockLevel)
      );
    }

    res.json({
      success: true,
      data: filteredProducts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve products' });
  }
};

export const getProductById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        unit: true,
        primaryUnit: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 15,
        },
      },
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve product' });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    const existingSku = await prisma.product.findUnique({
      where: { sku: data.sku.trim() },
    });

    if (existingSku) {
      res.status(400).json({ success: false, message: 'Product with this SKU already exists' });
      return;
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name.trim(),
          sku: data.sku.trim(),
          categoryId: data.categoryId,
          brand: data.brand.trim(),
          unitId: data.unitId,
          primaryUnitId: data.primaryUnitId || null,
          conversionFactor: new Prisma.Decimal(data.conversionFactor || 1),
          purchasePrice: new Prisma.Decimal(data.purchasePrice),
          salePrice: new Prisma.Decimal(data.salePrice),
          wholesalePrice: new Prisma.Decimal(data.wholesalePrice || data.salePrice),
          minimumStockLevel: new Prisma.Decimal(data.minimumStockLevel),
          openingStock: new Prisma.Decimal(data.openingStock),
          currentStock: new Prisma.Decimal(data.openingStock),
          description: data.description?.trim() || null,
          specifications: data.specifications?.trim() || null,
          imageUrl: data.imageUrl?.trim() || null,
          showOnWebsite: data.showOnWebsite,
          showInCatalog: data.showInCatalog,
          showPublicPrice: data.showPublicPrice,
          isActive: data.isActive,
        },
        include: {
          category: true,
          unit: true,
          primaryUnit: true,
        },
      });

      if (data.openingStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            movementType: MovementType.ADJUSTMENT,
            quantity: new Prisma.Decimal(data.openingStock),
            previousStock: new Prisma.Decimal(0),
            newStock: new Prisma.Decimal(data.openingStock),
            description: 'Opening Stock Entry',
          },
        });
      }

      return created;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'PRODUCT_CREATED',
      entityType: 'PRODUCT',
      entityId: product.id,
      details: { sku: product.sku, name: product.name, showOnWebsite: product.showOnWebsite },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.brand !== undefined) updateData.brand = body.brand.trim();
    if (body.unitId !== undefined) updateData.unitId = body.unitId;
    if (body.primaryUnitId !== undefined) updateData.primaryUnitId = body.primaryUnitId || null;
    if (body.conversionFactor !== undefined) updateData.conversionFactor = new Prisma.Decimal(body.conversionFactor);
    if (body.purchasePrice !== undefined) updateData.purchasePrice = new Prisma.Decimal(body.purchasePrice);
    if (body.salePrice !== undefined) updateData.salePrice = new Prisma.Decimal(body.salePrice);
    if (body.wholesalePrice !== undefined) updateData.wholesalePrice = new Prisma.Decimal(body.wholesalePrice);
    if (body.minimumStockLevel !== undefined) updateData.minimumStockLevel = new Prisma.Decimal(body.minimumStockLevel);
    if (body.currentStock !== undefined && !isNaN(Number(body.currentStock))) {
      updateData.currentStock = new Prisma.Decimal(body.currentStock);
    }
    if (body.description !== undefined) updateData.description = body.description ? body.description.trim() : null;
    if (body.specifications !== undefined) updateData.specifications = body.specifications ? body.specifications.trim() : null;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl ? body.imageUrl.trim() : null;
    if (body.showOnWebsite !== undefined) updateData.showOnWebsite = Boolean(body.showOnWebsite);
    if (body.showInCatalog !== undefined) updateData.showInCatalog = Boolean(body.showInCatalog);
    if (body.showPublicPrice !== undefined) updateData.showPublicPrice = Boolean(body.showPublicPrice);
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        unit: true,
        primaryUnit: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'PRODUCT_UPDATED',
      entityType: 'PRODUCT',
      entityId: product.id,
      details: updateData,
      ipAddress: req.ip,
    });

    res.json({ success: true, product });
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

// Stock Adjustment (Vyapar workflow)
export const adjustProductStock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    let { adjustmentQuantity, reason = 'Inventory Adjustment', isAddition = false, newStock: directNewStock } = req.body;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const currentStock = Number(product.currentStock);
    let newStock: number;
    let qty: number;

    if (directNewStock !== undefined && !isNaN(Number(directNewStock))) {
      newStock = Number(directNewStock);
      qty = Math.abs(newStock - currentStock);
      isAddition = newStock >= currentStock;
    } else {
      qty = Math.abs(parseFloat(adjustmentQuantity));
      if (isNaN(qty) || qty <= 0) {
        res.status(400).json({ success: false, message: 'Valid positive adjustment quantity is required' });
        return;
      }
      newStock = isAddition ? currentStock + qty : currentStock - qty;
    }

    if (newStock < 0) {
      const settings = await prisma.systemSetting.findFirst();
      if (!settings?.allowNegativeStock) {
        res.status(400).json({
          success: false,
          message: `Cannot reduce stock below zero. Current stock: ${currentStock}, Requested deduction: ${qty}`,
        });
        return;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: { currentStock: new Prisma.Decimal(newStock) },
      });

      await tx.stockMovement.create({
        data: {
          productId: id,
          movementType: MovementType.ADJUSTMENT,
          quantity: new Prisma.Decimal(qty),
          previousStock: new Prisma.Decimal(currentStock),
          newStock: new Prisma.Decimal(newStock),
          description: `${isAddition ? 'Stock In (Addition)' : 'Stock Out (Deduction)'}: ${reason}`,
        },
      });

      return p;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'PRODUCT',
      entityId: id,
      details: { previousStock: currentStock, newStock, quantity: qty, isAddition, reason },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Stock adjusted successfully', product: updated });
  } catch (error) {
    console.error('adjustProductStock error:', error);
    res.status(500).json({ success: false, message: 'Failed to adjust stock' });
  }
};

// Image Upload Endpoint
export const handleImageUpload = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No image file uploaded' });
    return;
  }

  let imageUrl: string;
  let filename: string = req.file.originalname;

  // On Vercel serverless, store as self-contained permanent base64 data URI (persists in DB forever)
  if (req.file.buffer) {
    const mime = req.file.mimetype || 'image/png';
    const base64Data = req.file.buffer.toString('base64');
    imageUrl = `data:${mime};base64,${base64Data}`;
    filename = req.file.originalname;
  } else {
    // Local development disk storage
    imageUrl = `/uploads/${req.file.filename}`;
    filename = req.file.filename;
  }

  res.json({
    success: true,
    message: 'Image uploaded successfully',
    imageUrl,
    filename,
  });
};

// Categories
export const getCategories = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get categories' });
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Category name is required' });
      return;
    }

    const category = await prisma.category.create({
      data: { name: name.trim(), description: description ? description.trim() : null },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CATEGORY_CREATED',
      entityType: 'CATEGORY',
      entityId: category.id,
      details: { name: category.name },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Category already exists or creation failed' });
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Category not found' });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

// Units
export const getUnits = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, units });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get units' });
  }
};

export const createUnit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, symbol } = req.body;
    if (!name || !symbol) {
      res.status(400).json({ success: false, message: 'Name and symbol are required' });
      return;
    }

    const unit = await prisma.unit.create({
      data: { name: name.trim(), symbol: symbol.trim() },
    });

    res.status(201).json({ success: true, unit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create unit' });
  }
};
