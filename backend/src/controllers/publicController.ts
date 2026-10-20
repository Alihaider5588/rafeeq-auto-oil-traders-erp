import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { z } from 'zod';

const inquirySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(5, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  subject: z.string().optional(),
  message: z.string().min(5, 'Message must be at least 5 characters'),
});

// GET /api/public/products
export const getPublicProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, categoryId, brand, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      isActive: true,
      showOnWebsite: true,
    };

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { brand: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (categoryId) {
      if (typeof categoryId === 'string') {
        const catIds = categoryId.includes(',') ? categoryId.split(',').filter(Boolean) : [categoryId];
        if (catIds.length === 1) {
          where.categoryId = catIds[0];
        } else if (catIds.length > 1) {
          where.categoryId = { in: catIds };
        }
      } else if (Array.isArray(categoryId)) {
        where.categoryId = { in: categoryId };
      }
    }

    if (brand && typeof brand === 'string') {
      where.brand = brand;
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          sku: true,
          brand: true,
          description: true,
          specifications: true,
          imageUrl: true,
          showPublicPrice: true,
          salePrice: true, // Only exposed if showPublicPrice is true
          category: {
            select: { id: true, name: true },
          },
          unit: {
            select: { id: true, name: true, symbol: true },
          },
          primaryUnit: {
            select: { id: true, name: true, symbol: true },
          },
          conversionFactor: true,
          currentStock: true, // Used for In Stock / Out of Stock badge
          // NEVER expose purchasePrice, supplier, wholesalePrice, or internal ledger/margin info
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
    ]);

    // Format products for public safe display
    const sanitizedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      category: p.category.name,
      categoryId: p.category.id,
      unit: p.unit.name,
      unitSymbol: p.unit.symbol,
      primaryUnit: p.primaryUnit?.name || null,
      primaryUnitSymbol: p.primaryUnit?.symbol || null,
      conversionFactor: Number(p.conversionFactor || 1),
      description: p.description || '',
      specifications: p.specifications || '',
      imageUrl: p.imageUrl || null,
      inStock: Number(p.currentStock) > 0,
      publicPrice: p.showPublicPrice ? Number(p.salePrice) : null,
      showPublicPrice: p.showPublicPrice,
    }));

    res.json({
      success: true,
      data: sanitizedProducts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('getPublicProducts error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve public products' });
  }
};

// GET /api/public/products/:id
export const getPublicProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        isActive: true,
        showOnWebsite: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        brand: true,
        description: true,
        specifications: true,
        imageUrl: true,
        showPublicPrice: true,
        salePrice: true,
        category: {
          select: { id: true, name: true },
        },
        unit: {
          select: { id: true, name: true, symbol: true },
        },
        primaryUnit: {
          select: { id: true, name: true, symbol: true },
        },
        conversionFactor: true,
        currentStock: true,
      },
    });

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found or not publicly available' });
      return;
    }

    const sanitized = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      brand: product.brand,
      category: product.category.name,
      categoryId: product.category.id,
      unit: product.unit.name,
      unitSymbol: product.unit.symbol,
      primaryUnit: product.primaryUnit?.name || null,
      primaryUnitSymbol: product.primaryUnit?.symbol || null,
      conversionFactor: Number(product.conversionFactor || 1),
      description: product.description || '',
      specifications: product.specifications || '',
      imageUrl: product.imageUrl || null,
      inStock: Number(product.currentStock) > 0,
      publicPrice: product.showPublicPrice ? Number(product.salePrice) : null,
      showPublicPrice: product.showPublicPrice,
    };

    res.json({ success: true, product: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve product details' });
  }
};

// GET /api/public/categories
export const getPublicCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                showOnWebsite: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const sanitized = categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      productCount: c._count.products,
    }));

    res.json({ success: true, categories: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve categories' });
  }
};

// GET /api/public/company
export const getPublicCompanyInfo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.systemSetting.findFirst();

    res.json({
      success: true,
      company: {
        name: settings?.companyName || 'RAFIQ AUTO & OIL TRADERS',
        address: settings?.address || '54-Stop Near MCB Bank, Dipalpur Road, Okara',
        phone: settings?.phone || '0306-9258573 / 0327-7497457',
        whatsapp: (settings as any)?.whatsappNumber || '0306-9258573',
        email: settings?.email || 'rafiqtreders003@gmail.com',
        proprietorNames: (settings as any)?.proprietorNames || 'M. Shafiq & Haji Muhammad Rafiq',
        operationalAreas: (settings as any)?.operationalAreas || 'Okara, Sahiwal, Kasur',
        facebookUrl: (settings as any)?.facebookUrl || '',
        tiktokUrl: (settings as any)?.tiktokUrl || '',
        operatingSchedule: (settings as any)?.operatingSchedule || '24/7 Operations (Round the Clock Support)',
        currency: settings?.currency || 'PKR',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve company info' });
  }
};

// POST /api/public/contact
export const submitPublicInquiry = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = inquirySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const { name, phone, email, subject, message } = parsed.data;

    const inquiry = await prisma.publicInquiry.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : null,
        subject: subject ? subject.trim() : 'Website Inquiry',
        message: message.trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your message has been received. Our sales team will contact you shortly.',
      inquiryId: inquiry.id,
    });
  } catch (error) {
    console.error('submitPublicInquiry error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit inquiry' });
  }
};

const webOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitType: z.enum(['PRIMARY', 'SECONDARY']).default('SECONDARY'),
});

const webOrderSchema = z.object({
  customerName: z.string().min(2, 'Your name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  shopName: z.string().optional().nullable(),
  cityArea: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(webOrderItemSchema).min(1, 'Please select at least one product'),
});

// POST /api/public/orders (Website Visitor Order Queue)
export const submitWebOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = webOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const { customerName, phone, shopName, cityArea, deliveryAddress, notes, items } = parsed.data;

    let totalAmount = 0;
    const processedItems: Array<{
      productId: string;
      quantity: number;
      unitType: string;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const it of items) {
      const prod = await prisma.product.findUnique({
        where: { id: it.productId, isActive: true, showOnWebsite: true },
        include: { primaryUnit: true, unit: true },
      });

      if (!prod) {
        res.status(400).json({ success: false, message: 'Selected product is unavailable or invalid.' });
        return;
      }

      const conv = Number(prod.conversionFactor || 1);
      const baseSalePrice = Number(prod.salePrice);
      const unitPrice = it.unitType === 'PRIMARY' ? baseSalePrice * conv : baseSalePrice;
      const lineTotal = it.quantity * unitPrice;
      totalAmount += lineTotal;

      processedItems.push({
        productId: prod.id,
        quantity: it.quantity,
        unitType: it.unitType,
        unitPrice,
        totalPrice: lineTotal,
      });
    }

    const orderNumber = `WEB-${Date.now().toString().slice(-6)}`;

    const webOrder = await prisma.webOrder.create({
      data: {
        orderNumber,
        customerName: customerName.trim(),
        phone: phone.trim(),
        shopName: shopName?.trim() || null,
        cityArea: cityArea?.trim() || null,
        deliveryAddress: deliveryAddress?.trim() || null,
        totalAmount: new Prisma.Decimal(totalAmount),
        notes: notes?.trim() || null,
        status: 'PENDING',
        items: {
          create: processedItems.map((p) => ({
            productId: p.productId,
            quantity: new Prisma.Decimal(p.quantity),
            unitType: p.unitType,
            unitPrice: new Prisma.Decimal(p.unitPrice),
            totalPrice: new Prisma.Decimal(p.totalPrice),
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Order received! Your order is queued. Our sales desk will verify and confirm.',
      order: {
        orderNumber: webOrder.orderNumber,
        totalAmount: Number(webOrder.totalAmount),
        status: webOrder.status,
      },
    });
  } catch (error) {
    console.error('submitWebOrder error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit online order' });
  }
};

