import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { MovementType, OrderStatus, PaymentMethod, Role, TransactionType } from '../types/enums';
import { Prisma } from '@prisma/client';
import { clearProductsCache } from './productController';
import { clearDashboardCache } from './reportController';

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be positive'),
  unitType: z.enum(['PRIMARY', 'SECONDARY']).default('SECONDARY').optional(),
  discount: z.number().min(0).default(0).optional(),
  discountPercent: z.number().min(0).max(100).default(0).optional(),
  deliveryStatus: z.enum(['DELIVERED', 'PENDING_DELIVERY']).default('DELIVERED').optional(),
});

const saleSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  salesmanId: z.string().min(1).optional().nullable(),
  saleDate: z.string().optional(),
  saleType: z.string().optional().default('VAN'), // 'COUNTER' or 'VAN'
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  discount: z.number().min(0).default(0),
  discountPercent: z.number().min(0).max(100).default(0).optional(),
  receivedAmount: z.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().optional().nullable(),
  clientReferenceId: z.string().optional(), // Idempotency key from salesman mobile
  deliveryStatus: z.enum(['DELIVERED', 'PENDING_DELIVERY']).default('DELIVERED').optional(),
});

export const getSales = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, salesmanId, status, startDate, endDate, saleType, search, page = '1', limit = '50', pendingDelivery } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.SaleWhereInput = {};

    if (req.user?.role === Role.SALESMAN) {
      where.salesmanId = req.user.id;
    } else {
      if (salesmanId) where.salesmanId = salesmanId as string;
    }

    if (customerId) where.customerId = customerId as string;

    // Filter by saleType and Counter/Van Cash vs Credit breakdown
    if (saleType === 'COUNTER') {
      where.saleType = 'COUNTER';
    } else if (saleType === 'VAN') {
      where.saleType = { not: 'COUNTER' };
    } else if (saleType === 'COUNTER_CASH') {
      where.saleType = 'COUNTER';
      where.remainingBalance = { lte: 0 };
    } else if (saleType === 'COUNTER_CREDIT') {
      where.saleType = 'COUNTER';
      where.remainingBalance = { gt: 0 };
    } else if (saleType === 'VAN_CASH') {
      where.saleType = { not: 'COUNTER' };
      where.remainingBalance = { lte: 0 };
    } else if (saleType === 'VAN_CREDIT') {
      where.saleType = { not: 'COUNTER' };
      where.remainingBalance = { gt: 0 };
    } else if (saleType) {
      where.saleType = saleType as string;
    }

    // Pending delivery orders filter (امانت / بعد میں سامان وصولی)
    if (pendingDelivery === 'true' || pendingDelivery === '1') {
      where.notes = { contains: 'PENDING_DELIVERY' };
    }

    if (status) where.status = status as string;
    if (startDate || endDate) {
      where.saleDate = {
        ...(startDate ? { gte: new Date(startDate as string) } : {}),
        ...(endDate ? { lte: new Date(endDate as string) } : {}),
      };
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customer: { shopName: { contains: q } } },
        { customer: { ownerName: { contains: q } } },
        { customer: { phone: { contains: q } } },
      ];
    }

    const baseWhere: Prisma.SaleWhereInput = {};
    if (req.user?.role === Role.SALESMAN) {
      baseWhere.salesmanId = req.user.id;
    } else if (salesmanId) {
      baseWhere.salesmanId = salesmanId as string;
    }

    const [
      total,
      sales,
      totalAll,
      totalCounter,
      totalVan,
      totalCounterCash,
      totalCounterCredit,
      totalVanCash,
      totalVanCredit,
      totalPendingDelivery,
      aggCounterCash,
      aggCounterCredit,
      aggVanCash,
      aggVanCredit,
    ] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          salesman: { select: { id: true, fullName: true, username: true } },
          createdBy: { select: { id: true, fullName: true, username: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  brand: true,
                  salePrice: true,
                  unit: { select: { id: true, name: true, symbol: true } },
                  primaryUnit: { select: { id: true, name: true, symbol: true } },
                },
              },
            },
          },
        },
        orderBy: { saleDate: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.sale.count({ where: baseWhere }),
      prisma.sale.count({ where: { ...baseWhere, saleType: 'COUNTER' } }),
      prisma.sale.count({ where: { ...baseWhere, saleType: { not: 'COUNTER' } } }),
      prisma.sale.count({ where: { ...baseWhere, saleType: 'COUNTER', remainingBalance: { lte: 0 } } }),
      prisma.sale.count({ where: { ...baseWhere, saleType: 'COUNTER', remainingBalance: { gt: 0 } } }),
      prisma.sale.count({ where: { ...baseWhere, saleType: { not: 'COUNTER' }, remainingBalance: { lte: 0 } } }),
      prisma.sale.count({ where: { ...baseWhere, saleType: { not: 'COUNTER' }, remainingBalance: { gt: 0 } } }),
      prisma.sale.count({ where: { ...baseWhere, notes: { contains: 'PENDING_DELIVERY' } } }),
      prisma.sale.aggregate({
        _sum: { netAmount: true, receivedAmount: true },
        where: { ...baseWhere, saleType: 'COUNTER', remainingBalance: { lte: 0 } },
      }),
      prisma.sale.aggregate({
        _sum: { netAmount: true, remainingBalance: true },
        where: { ...baseWhere, saleType: 'COUNTER', remainingBalance: { gt: 0 } },
      }),
      prisma.sale.aggregate({
        _sum: { netAmount: true, receivedAmount: true },
        where: { ...baseWhere, saleType: { not: 'COUNTER' }, remainingBalance: { lte: 0 } },
      }),
      prisma.sale.aggregate({
        _sum: { netAmount: true, remainingBalance: true },
        where: { ...baseWhere, saleType: { not: 'COUNTER' }, remainingBalance: { gt: 0 } },
      }),
    ]);

    res.setHeader('Cache-Control', 'private, max-age=5, stale-while-revalidate=15');
    res.json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      counts: {
        all: totalAll,
        counter: totalCounter,
        van: totalVan,
        counterCash: totalCounterCash,
        counterCredit: totalCounterCredit,
        vanCash: totalVanCash,
        vanCredit: totalVanCredit,
        pendingDelivery: totalPendingDelivery,
        counterCashTotal: Number(aggCounterCash._sum.receivedAmount || 0),
        counterCreditTotal: Number(aggCounterCredit._sum.remainingBalance || 0),
        vanCashTotal: Number(aggVanCash._sum.receivedAmount || 0),
        vanCreditTotal: Number(aggVanCredit._sum.remainingBalance || 0),
      },
    });
  } catch (error) {
    console.error('getSales error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve sales' });
  }
};

export const getSaleById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }],
      },
      include: {
        customer: true,
        salesman: { select: { id: true, fullName: true, phone: true } },
        createdBy: { select: { id: true, fullName: true } },
        items: {
          include: {
            product: {
              include: {
                unit: true,
                primaryUnit: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale invoice not found' });
      return;
    }

    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve invoice' });
  }
};

const customerRateCache = new Map<string, { data: any; expiry: number }>();

// Customer/Party-Wise Product Rate History lookup
export const getCustomerProductRate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, productId, unitType = 'SECONDARY' } = req.query;

    if (!customerId || !productId) {
      res.status(400).json({ success: false, message: 'customerId and productId are required' });
      return;
    }

    const cId = String(customerId);
    const pId = String(productId);
    const uType = String(unitType);
    const cacheKey = `${cId}:${pId}:${uType}`;

    const cached = customerRateCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      res.json(cached.data);
      return;
    }

    const [product, customer] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId as string },
        include: { unit: true, primaryUnit: true },
      }),
      prisma.customer.findUnique({
        where: { id: customerId as string },
      }),
    ]);

    if (!product || !customer) {
      res.status(404).json({ success: false, message: 'Product or Customer not found' });
      return;
    }

    const conversionFactor = Number(product.conversionFactor || 1);
    const standardSalePrice = Number(product.salePrice);
    const wholesalePrice = Number(product.wholesalePrice || product.salePrice);

    // Fetch past completed sales items for this customer + product (excluding cancelled)
    const recentSaleItems = await prisma.saleItem.findMany({
      where: {
        productId: product.id,
        sale: {
          customerId: customer.id,
          status: OrderStatus.COMPLETED,
        },
      },
      include: {
        sale: {
          select: {
            id: true,
            invoiceNumber: true,
            saleDate: true,
          },
        },
      },
      orderBy: {
        sale: {
          saleDate: 'desc',
        },
      },
      take: 10,
    });

    const hasHistory = recentSaleItems.length > 0;
    const latestItem = recentSaleItems[0] || null;

    let suggestedRate = standardSalePrice;
    let lastInvoiceNumber: string | null = null;
    let lastSaleDate: string | null = null;
    let lastUnitType = 'SECONDARY';

    if (latestItem) {
      suggestedRate = Number(latestItem.unitPrice);
      lastInvoiceNumber = latestItem.sale.invoiceNumber;
      lastSaleDate = latestItem.sale.saleDate.toISOString();
      lastUnitType = latestItem.unitType || 'SECONDARY';

      // If user asks for PRIMARY unit rate and previous was in SECONDARY unit:
      if (unitType === 'PRIMARY' && lastUnitType === 'SECONDARY') {
        suggestedRate = Number(latestItem.unitPrice) * conversionFactor;
      } else if (unitType === 'SECONDARY' && lastUnitType === 'PRIMARY') {
        suggestedRate = Number(latestItem.unitPrice) / conversionFactor;
      }
    } else {
      // No history: default to standard selling price based on requested unit
      if (unitType === 'PRIMARY') {
        suggestedRate = standardSalePrice * conversionFactor;
      }
    }

    const rateHistory = recentSaleItems.map((item) => ({
      invoiceNumber: item.sale.invoiceNumber,
      saleDate: item.sale.saleDate,
      quantity: Number(item.quantity),
      unitType: item.unitType,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    }));

    const rateResponse = {
      success: true,
      hasHistory,
      suggestedRate: Math.round(suggestedRate * 100) / 100,
      lastInvoiceNumber,
      lastSaleDate,
      lastUnitType,
      standardSalePrice,
      wholesalePrice,
      conversionFactor,
      primaryUnit: product.primaryUnit,
      baseUnit: product.unit,
      rateHistory,
    };

    customerRateCache.set(cacheKey, { data: rateResponse, expiry: Date.now() + 5 * 60 * 1000 });
    res.json(rateResponse);
  } catch (error) {
    console.error('getCustomerProductRate error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve rate history' });
  }
};

// Customer/Party-Wide Rate History lookup (returns all products and their last negotiated rates for a customer)
export const getCustomerAllRates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.query;

    if (!customerId) {
      // If no customerId provided, return recent customer rates from customerProductRate
      let rates: any[] = [];
      if ((prisma as any).customerProductRate) {
        rates = await (prisma as any).customerProductRate.findMany({
          take: 100,
          orderBy: { lastSaleDate: 'desc' },
          include: {
            customer: {
              select: { id: true, shopName: true, ownerName: true, phone: true }
            },
            product: {
              include: { unit: true, primaryUnit: true }
            }
          }
        });
      }

      res.json({
        success: true,
        rates: rates.map((r: any) => ({
          id: r.id,
          customerId: r.customerId,
          customer: r.customer,
          product: r.product,
          unitType: r.lastUnitType,
          lastRate: Number(r.lastUnitPrice),
          lastInvoice: r.lastInvoiceNumber,
          lastDate: r.lastSaleDate,
        }))
      });
      return;
    }

    const cId = String(customerId);
    const ratesMap = new Map<string, any>();

    // 1. Check customerProductRate table first
    if ((prisma as any).customerProductRate) {
      const recordedRates = await (prisma as any).customerProductRate.findMany({
        where: { customerId: cId },
        include: {
          product: {
            include: { unit: true, primaryUnit: true }
          }
        },
        orderBy: { lastSaleDate: 'desc' }
      });

      for (const r of recordedRates) {
        if (r.product) {
          ratesMap.set(r.productId, {
            id: r.id,
            productId: r.productId,
            product: r.product,
            unitType: r.lastUnitType,
            lastRate: Number(r.lastUnitPrice),
            lastInvoice: r.lastInvoiceNumber,
            lastDate: r.lastSaleDate,
          });
        }
      }
    }

    // 2. Also check recent saleItems for this customer in completed sales (in case some sales occurred before upsert)
    const recentSaleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          customerId: cId,
          status: OrderStatus.COMPLETED
        }
      },
      include: {
        sale: {
          select: { invoiceNumber: true, saleDate: true }
        },
        product: {
          include: { unit: true, primaryUnit: true }
        }
      },
      orderBy: {
        sale: { saleDate: 'desc' }
      },
      take: 200
    });

    for (const it of recentSaleItems) {
      if (it.product && !ratesMap.has(it.productId)) {
        ratesMap.set(it.productId, {
          id: it.id,
          productId: it.productId,
          product: it.product,
          unitType: it.unitType || 'SECONDARY',
          lastRate: Number(it.unitPrice),
          lastInvoice: it.sale.invoiceNumber,
          lastDate: it.sale.saleDate,
        });
      }
    }

    const ratesList = Array.from(ratesMap.values());

    res.json({
      success: true,
      rates: ratesList
    });
  } catch (error) {
    console.error('getCustomerAllRates error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve customer rates' });
  }
};

export const createSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = saleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const userId = req.user!.id;
    const assignedSalesmanId = data.salesmanId || (req.user!.role === Role.SALESMAN ? userId : null);

    const productIds = Array.from(new Set(data.items.map((it) => it.productId)));

    // Fetch System Settings, Customer, and all required Products in 1 single parallel roundtrip
    const [settings, customer, fetchedProducts] = await Promise.all([
      prisma.systemSetting.findFirst(),
      prisma.customer.findUnique({ where: { id: data.customerId } }),
      prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { unit: true, primaryUnit: true },
      }),
    ]);

    const allowNegativeStock = settings?.allowNegativeStock ?? false;
    const requireApproval = settings?.requireOrderApproval && req.user!.role === Role.SALESMAN;

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const prodMap = new Map(fetchedProducts.map((p) => [p.id, p]));

    // Verify stock availability & calculate costs with Primary/Secondary unit conversion
    let totalSaleAmount = 0;
    let totalSaleCost = 0;
    const itemDetails: Array<{
      productId: string;
      quantity: number;
      unitType: string;
      baseQuantity: number;
      unitPrice: number;
      unitCost: number;
      totalPrice: number;
      profit: number;
      currentStock: number;
      productName: string;
      standardPrice: number;
    }> = [];

    for (const item of data.items) {
      const prod = prodMap.get(item.productId);
      if (!prod) {
        res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
        return;
      }

      const unitType = item.unitType === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY';
      const conversionFactor = Number(prod.conversionFactor || 1);

      // Calculate base quantity in secondary (base) units
      const baseQuantity = unitType === 'PRIMARY' ? item.quantity * conversionFactor : item.quantity;

      const available = Number(prod.currentStock);
      if (!allowNegativeStock && available < baseQuantity) {
        const unitLabel = prod.unit?.name || 'Units';
        const primaryLabel = prod.primaryUnit?.name || 'Carton';
        res.status(400).json({
          success: false,
          message: `Insufficient stock for product '${prod.name}'. In Stock: ${available} ${unitLabel}, Requested: ${baseQuantity} ${unitLabel} (${item.quantity} ${unitType === 'PRIMARY' ? primaryLabel : unitLabel})`,
        });
        return;
      }

      // Unit cost is in base units
      const unitCost = Number(prod.purchasePrice);
      const grossPrice = item.quantity * item.unitPrice;
      let itemDiscount = Number(item.discount || 0);
      if (item.discountPercent && item.discountPercent > 0) {
        itemDiscount = (grossPrice * item.discountPercent) / 100;
      }
      const totalPrice = Math.max(0, grossPrice - itemDiscount);
      const totalCost = baseQuantity * unitCost;
      const profit = totalPrice - totalCost;

      totalSaleAmount += totalPrice;
      totalSaleCost += totalCost;

      itemDetails.push({
        productId: prod.id,
        quantity: item.quantity,
        unitType,
        baseQuantity,
        unitPrice: item.unitPrice,
        unitCost,
        totalPrice,
        profit,
        currentStock: available,
        productName: prod.name,
        standardPrice: Number(prod.salePrice),
      });
    }

    let billDiscount = Number(data.discount || 0);
    if (data.discountPercent && data.discountPercent > 0) {
      billDiscount = (totalSaleAmount * data.discountPercent) / 100;
    }
    const netAmount = Math.max(0, totalSaleAmount - billDiscount);
    const remainingBalance = netAmount - data.receivedAmount;
    const totalGrossProfit = netAmount - totalSaleCost;

    // Credit Limit Verification: Block sale if customer exceeds their assigned credit limit
    const creditLimit = Number(customer.creditLimit || 0);
    const currentReceivable = Number(customer.currentReceivable || 0);
    const isWalkIn = customer.phone === '00000000000' || customer.shopName.toLowerCase().includes('walk-in');
    const projectedReceivable = currentReceivable + remainingBalance;

    // RULE: Walk-in counter customer ko udhar / credit par saman dena sakht mana hai
    if (isWalkIn && remainingBalance > 0) {
      res.status(400).json({
        success: false,
        message: `⛔ Walk-in Counter Customer ko koi cheez credit / udhar par nahi di ja sakti! Baqaya udhar: Rs. ${remainingBalance.toLocaleString()}. Agar is customer ko udhar dena hai to pehle isay 'Customers' page par add karein taake iska proper khata ban sake.`,
      });
      return;
    }

    if (!isWalkIn && creditLimit > 0 && projectedReceivable > creditLimit) {
      res.status(400).json({
        success: false,
        message: `⛔ Credit Limit Exceeded! Is customer ka kul udhar (Rs. ${projectedReceivable.toLocaleString()}) iski credit limit (Rs. ${creditLimit.toLocaleString()}) se barh gaya hai. Bill creation disabled hai. Agar invoice banani hai to Customers page se iski credit limit barhayein ya cash wasooli karein.`,
      });
      return;
    }

    const invoiceNumber = `ROT-INV-${Date.now().toString().slice(-8)}`;
    const orderStatus = requireApproval ? OrderStatus.PENDING_APPROVAL : OrderStatus.COMPLETED;
    const saleDate = data.saleDate ? new Date(data.saleDate) : new Date();

    // Check if entire bill or any individual item is marked for pending delivery (امانت / بعد میں وصولی)
    const hasPendingDelivery = data.deliveryStatus === 'PENDING_DELIVERY' || data.items.some((it) => it.deliveryStatus === 'PENDING_DELIVERY');
    const deliveryMeta = {
      status: hasPendingDelivery ? 'PENDING_DELIVERY' : 'DELIVERED',
      items: data.items.map((it) => {
        const prod = prodMap.get(it.productId);
        return {
          productId: it.productId,
          productName: prod?.name || 'Product',
          quantity: it.quantity,
          unitType: it.unitType || 'SECONDARY',
          status: it.deliveryStatus || (data.deliveryStatus === 'PENDING_DELIVERY' ? 'PENDING_DELIVERY' : 'DELIVERED'),
        };
      }),
      createdAt: new Date().toISOString(),
      deliveredAt: hasPendingDelivery ? null : new Date().toISOString(),
    };
    const finalNotes = hasPendingDelivery
      ? `[DELIVERY_META:${JSON.stringify(deliveryMeta)}] ${data.notes || ''}`.trim()
      : (data.notes || null);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: data.customerId,
          salesmanId: assignedSalesmanId,
          createdById: userId,
          saleDate,
          totalAmount: new Prisma.Decimal(totalSaleAmount),
          discount: new Prisma.Decimal(billDiscount),
          netAmount: new Prisma.Decimal(netAmount),
          receivedAmount: new Prisma.Decimal(data.receivedAmount),
          remainingBalance: new Prisma.Decimal(remainingBalance),
          totalCost: new Prisma.Decimal(totalSaleCost),
          grossProfit: new Prisma.Decimal(totalGrossProfit),
          paymentMethod: data.paymentMethod,
          status: orderStatus,
          saleType: data.saleType || 'VAN',
          notes: finalNotes,
          items: {
            create: itemDetails.map((it) => ({
              productId: it.productId,
              quantity: new Prisma.Decimal(it.quantity),
              unitType: it.unitType,
              baseQuantity: new Prisma.Decimal(it.baseQuantity),
              unitPrice: new Prisma.Decimal(it.unitPrice),
              unitCost: new Prisma.Decimal(it.unitCost),
              totalPrice: new Prisma.Decimal(it.totalPrice),
              profit: new Prisma.Decimal(it.profit),
            })),
          },
        },
        include: { items: true },
      });

      // If completed immediately (not pending approval):
      if (orderStatus === OrderStatus.COMPLETED) {
        // 2. Reduce Stock automatically using BASE QUANTITY & update Batch Pricing
        for (const it of itemDetails) {
          const newStock = it.currentStock - it.baseQuantity;

          // Check and decrement active batch pricing if present
          const currentProd = await tx.product.findUnique({
            where: { id: it.productId },
            select: { specifications: true },
          });

          let updatedSpecs = currentProd?.specifications || null;
          if (updatedSpecs && updatedSpecs.includes('[BATCH_PRICING:')) {
            try {
              const match = updatedSpecs.match(/\[BATCH_PRICING:(.*?)\]/);
              if (match) {
                const batchMeta = JSON.parse(match[1]);
                const remaining = Number(batchMeta.remainingBatchQty || 0) - it.baseQuantity;
                const cleanSpecs = updatedSpecs.replace(/\[BATCH_PRICING:.*?\]\s*/g, '').trim();
                if (remaining > 0) {
                  batchMeta.remainingBatchQty = remaining;
                  updatedSpecs = `[BATCH_PRICING:${JSON.stringify(batchMeta)}] ${cleanSpecs}`.trim();
                } else {
                  // Entire batch consumed! Clear batch price tag automatically
                  updatedSpecs = cleanSpecs || null;
                }
              }
            } catch (e) {
              console.error('Error updating batch pricing remaining qty:', e);
            }
          }

          await tx.product.update({
            where: { id: it.productId },
            data: {
              currentStock: new Prisma.Decimal(newStock),
              specifications: updatedSpecs,
            },
          });

          // 3. Upsert Customer/Party-Wise Product Rate History
          if ((tx as any).customerProductRate) {
            await (tx as any).customerProductRate.upsert({
              where: {
                customerId_productId: {
                  customerId: customer.id,
                  productId: it.productId,
                },
              },
              update: {
                lastUnitPrice: new Prisma.Decimal(it.unitPrice),
                lastUnitType: it.unitType,
                lastInvoiceNumber: invoiceNumber,
                lastSaleDate: saleDate,
              },
              create: {
                customerId: customer.id,
                productId: it.productId,
                lastUnitPrice: new Prisma.Decimal(it.unitPrice),
                lastUnitType: it.unitType,
                lastInvoiceNumber: invoiceNumber,
                lastSaleDate: saleDate,
              },
            });
          }
        }

        // Batch create all stock movements
        const stockMovementsData = itemDetails.map((it) => ({
          productId: it.productId,
          movementType: MovementType.SALE,
          quantity: new Prisma.Decimal(it.baseQuantity),
          previousStock: new Prisma.Decimal(it.currentStock),
          newStock: new Prisma.Decimal(it.currentStock - it.baseQuantity),
          referenceId: sale.id,
          description: `Sale Inv #${invoiceNumber} (${it.quantity} ${it.unitType})`,
        }));

        if (typeof (tx.stockMovement as any).createMany === 'function') {
          await tx.stockMovement.createMany({ data: stockMovementsData });
        } else {
          for (const sm of stockMovementsData) {
            await tx.stockMovement.create({ data: sm });
          }
        }

        // 4. Update Customer Ledger & Current Receivable
        const currentReceivable = isWalkIn ? 0 : Number(customer.currentReceivable);
        const newReceivable = isWalkIn ? 0 : (currentReceivable + remainingBalance);

        await tx.customer.update({
          where: { id: customer.id },
          data: { currentReceivable: new Prisma.Decimal(newReceivable) },
        });

        await tx.customerLedger.create({
          data: {
            customerId: customer.id,
            date: sale.saleDate,
            transactionType: TransactionType.SALE_INVOICE,
            referenceId: sale.id,
            description: `Sale Invoice #${invoiceNumber}`,
            debit: new Prisma.Decimal(netAmount),
            credit: new Prisma.Decimal(0),
            runningBalance: new Prisma.Decimal(currentReceivable + netAmount),
          },
        });

        // If payment received at counter:
        if (data.receivedAmount > 0) {
          await tx.customerLedger.create({
            data: {
              customerId: customer.id,
              date: sale.saleDate,
              transactionType: TransactionType.CUSTOMER_PAYMENT,
              referenceId: sale.id,
              description: `Payment for Inv #${invoiceNumber} (${data.paymentMethod})`,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(data.receivedAmount),
              runningBalance: new Prisma.Decimal(newReceivable),
            },
          });

          await tx.payment.create({
            data: {
              receiptNumber: `REC-POS-${Date.now().toString().slice(-8)}`,
              customerId: customer.id,
              amount: new Prisma.Decimal(data.receivedAmount),
              paymentMethod: data.paymentMethod,
              reference: invoiceNumber,
              notes: `POS Received on sale #${invoiceNumber}`,
              recordedById: userId,
            },
          });
        }
      }

      return sale;
    });

    // Fire-and-forget background audit logs without delaying the invoice HTTP response
    (async () => {
      try {
        const priceOverrides = itemDetails.filter((it) => it.unitPrice !== it.standardPrice);
        if (priceOverrides.length > 0) {
          await logAudit({
            userId,
            action: 'PRICE_OVERRIDE',
            entityType: 'SALE',
            entityId: result.id,
            details: {
              invoiceNumber,
              customer: customer.shopName,
              overrides: priceOverrides.map((o) => ({
                product: o.productName,
                standard: o.standardPrice,
                charged: o.unitPrice,
                unitType: o.unitType,
              })),
            },
            ipAddress: req.ip,
          });
        }

        await logAudit({
          userId,
          action: 'SALE_CREATED',
          entityType: 'SALE',
          entityId: result.id,
          details: {
            invoiceNumber,
            customer: customer.shopName,
            netAmount,
            receivedAmount: data.receivedAmount,
            grossProfit: totalGrossProfit,
          },
          ipAddress: req.ip,
        });
      } catch (logErr) {
        console.error('Async audit log error:', logErr);
      }
    })();

    customerRateCache.clear();
    clearProductsCache();
    clearDashboardCache();

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      sale: result,
    });
  } catch (error: any) {
    console.error('createSale error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process sale' });
  }
};

export const approveSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale not found' });
      return;
    }

    if (sale.status !== OrderStatus.PENDING_APPROVAL) {
      res.status(400).json({ success: false, message: `Sale is already in status '${sale.status}'` });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Stock deduction using baseQuantity
      for (const item of sale.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod) continue;
        const cur = Number(prod.currentStock);
        const baseQty = Number(item.baseQuantity || item.quantity);
        const nxt = cur - baseQty;

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: new Prisma.Decimal(nxt) },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: MovementType.SALE,
            quantity: new Prisma.Decimal(baseQty),
            previousStock: new Prisma.Decimal(cur),
            newStock: new Prisma.Decimal(nxt),
            referenceId: sale.id,
            description: `Approved Salesman Order #${sale.invoiceNumber} (${item.quantity} ${item.unitType})`,
          },
        });

        // Update rate history
        if ((tx as any).customerProductRate) {
          await (tx as any).customerProductRate.upsert({
            where: {
              customerId_productId: {
                customerId: sale.customerId,
                productId: item.productId,
              },
            },
            update: {
              lastUnitPrice: item.unitPrice,
              lastUnitType: item.unitType,
              lastInvoiceNumber: sale.invoiceNumber,
              lastSaleDate: new Date(),
            },
            create: {
              customerId: sale.customerId,
              productId: item.productId,
              lastUnitPrice: item.unitPrice,
              lastUnitType: item.unitType,
              lastInvoiceNumber: sale.invoiceNumber,
              lastSaleDate: new Date(),
            },
          });
        }
      }

      // Ledger deduction
      const curReceivable = Number(sale.customer.currentReceivable);
      const rem = Number(sale.remainingBalance);
      const newRec = curReceivable + rem;

      await tx.customer.update({
        where: { id: sale.customerId },
        data: { currentReceivable: new Prisma.Decimal(newRec) },
      });

      await tx.customerLedger.create({
        data: {
          customerId: sale.customerId,
          date: new Date(),
          transactionType: TransactionType.SALE_INVOICE,
          referenceId: sale.id,
          description: `Approved Sale Inv #${sale.invoiceNumber}`,
          debit: sale.netAmount,
          credit: new Prisma.Decimal(0),
          runningBalance: new Prisma.Decimal(curReceivable + Number(sale.netAmount)),
        },
      });

      if (Number(sale.receivedAmount) > 0) {
        await tx.customerLedger.create({
          data: {
            customerId: sale.customerId,
            date: new Date(),
            transactionType: TransactionType.CUSTOMER_PAYMENT,
            referenceId: sale.id,
            description: `Order payment for #${sale.invoiceNumber}`,
            debit: new Prisma.Decimal(0),
            credit: sale.receivedAmount,
            runningBalance: new Prisma.Decimal(newRec),
          },
        });
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: OrderStatus.COMPLETED },
      });
    });

    await logAudit({
      userId: req.user?.id,
      action: 'SALE_APPROVED',
      entityType: 'SALE',
      entityId: sale.id,
      details: { invoiceNumber: sale.invoiceNumber },
      ipAddress: req.ip,
    });

    clearProductsCache();
    clearDashboardCache();
    res.json({ success: true, message: 'Order approved and stock/ledger updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Approval failed' });
  }
};

// Void / Cancel completed invoice with safe stock & ledger reversal
export const cancelSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by authorized user' } = req.body;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true, customer: true },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale not found' });
      return;
    }

    if (sale.status === OrderStatus.CANCELLED) {
      res.status(400).json({ success: false, message: 'Sale is already cancelled' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // If was completed, reverse stock & ledger
      if (sale.status === OrderStatus.COMPLETED) {
        for (const item of sale.items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod) continue;

          const cur = Number(prod.currentStock);
          const baseQty = Number(item.baseQuantity || item.quantity);
          const restored = cur + baseQty;

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: new Prisma.Decimal(restored) },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              movementType: MovementType.SALE_RETURN,
              quantity: new Prisma.Decimal(baseQty),
              previousStock: new Prisma.Decimal(cur),
              newStock: new Prisma.Decimal(restored),
              referenceId: sale.id,
              description: `Voided Sale Inv #${sale.invoiceNumber}: ${reason}`,
            },
          });
        }

        // Reverse Customer Ledger
        const curReceivable = Number(sale.customer.currentReceivable);
        const rem = Number(sale.remainingBalance);
        const newRec = curReceivable - rem;

        await tx.customer.update({
          where: { id: sale.customerId },
          data: { currentReceivable: new Prisma.Decimal(newRec) },
        });

        await tx.customerLedger.create({
          data: {
            customerId: sale.customerId,
            date: new Date(),
            transactionType: TransactionType.SALE_RETURN,
            referenceId: sale.id,
            description: `Voided Sale Inv #${sale.invoiceNumber}: ${reason}`,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(rem),
            runningBalance: new Prisma.Decimal(newRec),
          },
        });
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: OrderStatus.CANCELLED },
      });
    });

    await logAudit({
      userId: req.user?.id,
      action: 'SALE_CANCELLED',
      entityType: 'SALE',
      entityId: sale.id,
      details: { invoiceNumber: sale.invoiceNumber, reason },
      ipAddress: req.ip,
    });

    clearProductsCache();
    clearDashboardCache();
    res.json({ success: true, message: 'Sale voided and stock/ledger reversed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to cancel sale' });
  }
};

// ==========================================
// ADMIN-ONLY: EDIT / RE-CORRECT SALE INVOICE
// ==========================================
export const editSaleInvoice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = saleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    // Check existing sale
    const existingSale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!existingSale) {
      res.status(404).json({ success: false, message: 'Sale invoice not found' });
      return;
    }

    if (existingSale.status === OrderStatus.CANCELLED) {
      res.status(400).json({ success: false, message: 'Cancelled sale cannot be edited' });
      return;
    }

    const newCustomer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!newCustomer) {
      res.status(404).json({ success: false, message: 'Target customer not found' });
      return;
    }

    // Calculate new item costs and stock deltas
    let totalSaleAmount = 0;
    let totalSaleCost = 0;
    const newItemDetails: Array<{
      productId: string;
      quantity: number;
      unitType: string;
      baseQuantity: number;
      unitPrice: number;
      unitCost: number;
      totalPrice: number;
      profit: number;
    }> = [];

    for (const item of data.items) {
      const prod = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!prod) {
        res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
        return;
      }

      const unitType = item.unitType === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY';
      const conversionFactor = Number(prod.conversionFactor || 1);
      const baseQuantity = unitType === 'PRIMARY' ? item.quantity * conversionFactor : item.quantity;
      const unitCost = Number(prod.purchasePrice);
      const grossPrice = item.quantity * item.unitPrice;
      let itemDiscount = Number(item.discount || 0);
      if (item.discountPercent && item.discountPercent > 0) {
        itemDiscount = (grossPrice * item.discountPercent) / 100;
      }
      const totalPrice = Math.max(0, grossPrice - itemDiscount);
      const totalCost = baseQuantity * unitCost;
      const profit = totalPrice - totalCost;

      totalSaleAmount += totalPrice;
      totalSaleCost += totalCost;

      newItemDetails.push({
        productId: prod.id,
        quantity: item.quantity,
        unitType,
        baseQuantity,
        unitPrice: item.unitPrice,
        unitCost,
        totalPrice,
        profit,
      });
    }

    let billDiscount = Number(data.discount || 0);
    if (data.discountPercent && data.discountPercent > 0) {
      billDiscount = (totalSaleAmount * data.discountPercent) / 100;
    }
    const netAmount = Math.max(0, totalSaleAmount - billDiscount);
    const remainingBalance = netAmount - data.receivedAmount;
    const totalGrossProfit = netAmount - totalSaleCost;
    const saleDate = data.saleDate ? new Date(data.saleDate) : existingSale.saleDate;

    const isWalkIn = newCustomer.phone === '00000000000' || newCustomer.shopName.toLowerCase().includes('walk-in');
    if (isWalkIn && remainingBalance > 0) {
      res.status(400).json({
        success: false,
        message: `⛔ Walk-in Counter Customer ko koi cheez credit / udhar par nahi di ja sakti! Baqaya udhar: Rs. ${remainingBalance.toLocaleString()}. Agar is customer ko udhar dena hai to pehle isay 'Customers' page par add karein taake iska proper khata ban sake.`,
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. REVERSE PREVIOUS STOCK (if sale was completed)
      if (existingSale.status === OrderStatus.COMPLETED) {
        for (const oldItem of existingSale.items) {
          const prod = await tx.product.findUnique({ where: { id: oldItem.productId } });
          if (!prod) continue;

          const cur = Number(prod.currentStock);
          const baseQty = Number(oldItem.baseQuantity || oldItem.quantity);
          const restored = cur + baseQty;

          await tx.product.update({
            where: { id: oldItem.productId },
            data: { currentStock: new Prisma.Decimal(restored) },
          });

          await tx.stockMovement.create({
            data: {
              productId: oldItem.productId,
              movementType: MovementType.ADJUSTMENT,
              quantity: new Prisma.Decimal(baseQty),
              previousStock: new Prisma.Decimal(cur),
              newStock: new Prisma.Decimal(restored),
              referenceId: existingSale.id,
              description: `Admin Edit: Restored stock for Inv #${existingSale.invoiceNumber}`,
            },
          });
        }

        // 2. REVERSE OLD CUSTOMER RECEIVABLE
        const oldCust = await tx.customer.findUnique({ where: { id: existingSale.customerId } });
        if (oldCust) {
          const isOldWalkIn = oldCust.phone === '00000000000' || oldCust.shopName.toLowerCase().includes('walk-in');
          const oldReceivable = isOldWalkIn ? 0 : Number(oldCust.currentReceivable);
          const oldRemaining = Number(existingSale.remainingBalance);
          const reversedReceivable = isOldWalkIn ? 0 : (oldReceivable - oldRemaining);

          await tx.customer.update({
            where: { id: existingSale.customerId },
            data: { currentReceivable: new Prisma.Decimal(reversedReceivable) },
          });

          await tx.customerLedger.create({
            data: {
              customerId: existingSale.customerId,
              date: new Date(),
              transactionType: TransactionType.ADJUSTMENT,
              referenceId: existingSale.id,
              description: `Correction/Edit Adjustment: Inv #${existingSale.invoiceNumber}`,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(oldRemaining),
              runningBalance: new Prisma.Decimal(reversedReceivable),
            },
          });
        }
      }

      // 3. DELETE OLD ITEMS
      await tx.saleItem.deleteMany({
        where: { saleId: existingSale.id },
      });

      // 4. UPDATE SALE RECORD WITH NEW DETAILS
      const updatedSale = await tx.sale.update({
        where: { id: existingSale.id },
        data: {
          customerId: data.customerId,
          salesmanId: data.salesmanId || existingSale.salesmanId,
          saleDate,
          totalAmount: new Prisma.Decimal(totalSaleAmount),
          discount: new Prisma.Decimal(billDiscount),
          netAmount: new Prisma.Decimal(netAmount),
          receivedAmount: new Prisma.Decimal(data.receivedAmount),
          remainingBalance: new Prisma.Decimal(remainingBalance),
          totalCost: new Prisma.Decimal(totalSaleCost),
          grossProfit: new Prisma.Decimal(totalGrossProfit),
          paymentMethod: data.paymentMethod,
          saleType: data.saleType || existingSale.saleType || 'VAN',
          notes: data.notes || existingSale.notes,
          items: {
            create: newItemDetails.map((it) => ({
              productId: it.productId,
              quantity: new Prisma.Decimal(it.quantity),
              unitType: it.unitType,
              baseQuantity: new Prisma.Decimal(it.baseQuantity),
              unitPrice: new Prisma.Decimal(it.unitPrice),
              unitCost: new Prisma.Decimal(it.unitCost),
              totalPrice: new Prisma.Decimal(it.totalPrice),
              profit: new Prisma.Decimal(it.profit),
            })),
          },
        },
        include: { items: true },
      });

      // 5. APPLY NEW STOCK DEDUCTION (if completed)
      if (existingSale.status === OrderStatus.COMPLETED) {
        for (const it of newItemDetails) {
          const prod = await tx.product.findUnique({ where: { id: it.productId } });
          if (!prod) continue;

          const cur = Number(prod.currentStock);
          const newStock = cur - it.baseQuantity;

          await tx.product.update({
            where: { id: it.productId },
            data: { currentStock: new Prisma.Decimal(newStock) },
          });

          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              movementType: MovementType.SALE,
              quantity: new Prisma.Decimal(it.baseQuantity),
              previousStock: new Prisma.Decimal(cur),
              newStock: new Prisma.Decimal(newStock),
              referenceId: updatedSale.id,
              description: `Admin Edit: Applied new items for Inv #${existingSale.invoiceNumber}`,
            },
          });
        }

        // 6. APPLY NEW CUSTOMER RECEIVABLE & LEDGER
        const freshCust = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (freshCust) {
          const isFreshWalkIn = freshCust.phone === '00000000000' || freshCust.shopName.toLowerCase().includes('walk-in');
          const curReceivable = isFreshWalkIn ? 0 : Number(freshCust.currentReceivable);
          const newReceivable = isFreshWalkIn ? 0 : (curReceivable + remainingBalance);

          await tx.customer.update({
            where: { id: data.customerId },
            data: { currentReceivable: new Prisma.Decimal(newReceivable) },
          });

          await tx.customerLedger.create({
            data: {
              customerId: data.customerId,
              date: saleDate,
              transactionType: TransactionType.SALE_INVOICE,
              referenceId: updatedSale.id,
              description: `Corrected Sale Invoice #${existingSale.invoiceNumber}`,
              debit: new Prisma.Decimal(netAmount),
              credit: new Prisma.Decimal(0),
              runningBalance: new Prisma.Decimal(curReceivable + netAmount),
            },
          });

          if (data.receivedAmount > 0) {
            await tx.customerLedger.create({
              data: {
                customerId: data.customerId,
                date: saleDate,
                transactionType: TransactionType.CUSTOMER_PAYMENT,
                referenceId: updatedSale.id,
                description: `Corrected Payment for Inv #${existingSale.invoiceNumber} (${data.paymentMethod})`,
                debit: new Prisma.Decimal(0),
                credit: new Prisma.Decimal(data.receivedAmount),
                runningBalance: new Prisma.Decimal(newReceivable),
              },
            });
          }
        }
      }

      return updatedSale;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'SALE_EDITED_BY_ADMIN',
      entityType: 'SALE',
      entityId: existingSale.id,
      details: {
        invoiceNumber: existingSale.invoiceNumber,
        newCustomer: data.customerId,
        newNetAmount: netAmount,
      },
      ipAddress: req.ip,
    });

    clearProductsCache();
    clearDashboardCache();
    res.json({ success: true, message: 'Sale invoice corrected successfully by Admin' });
  } catch (error: any) {
    console.error('editSaleInvoice error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to edit sale invoice' });
  }
};

// ==========================================
// SALES RETURN WITH REASON TRACKING (ORDER WAPIS)
// ==========================================
const returnItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive('Quantity to return must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be positive'),
});

const salesReturnSchema = z.object({
  saleId: z.string().min(1, 'Sale ID is required'),
  reason: z.string().min(1, 'Reason for return is required'), // Damaged, Wrong Viscosity/Item, Customer Cancelled, Warranty Claim, etc.
  items: z.array(returnItemSchema).min(1, 'At least one item to return is required'),
  refundAmount: z.number().min(0).default(0), // Cash refunded back or 0 to credit customer ledger
  returnDate: z.string().optional(),
  isClaim: z.boolean().default(false).optional(),
  claimResolution: z.enum(['REFUND', 'REPLACEMENT']).default('REFUND').optional(),
  claimCategory: z.enum(['OIL', 'NON_OIL']).default('NON_OIL').optional(),
});

export const createSalesReturn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = salesReturnSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const { saleId, reason, items, refundAmount, returnDate, isClaim = false, claimResolution = 'REFUND', claimCategory = 'NON_OIL' } = parsed.data;

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale invoice not found' });
      return;
    }

    if (sale.status === OrderStatus.CANCELLED) {
      res.status(400).json({ success: false, message: 'Cannot process return for a cancelled sale' });
      return;
    }

    let totalRefundValue = 0;
    const validatedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalRefund: number;
      baseQuantity: number;
    }> = [];

    for (const it of items) {
      const soldItem = sale.items.find((si) => si.productId === it.productId);
      if (!soldItem) {
        res.status(400).json({
          success: false,
          message: `Product was not found in original invoice #${sale.invoiceNumber}`,
        });
        return;
      }

      if (it.quantity > Number(soldItem.quantity)) {
        res.status(400).json({
          success: false,
          message: `Return quantity (${it.quantity}) cannot exceed invoiced quantity (${soldItem.quantity})`,
        });
        return;
      }

      const prod = await prisma.product.findUnique({ where: { id: it.productId } });
      const conversionFactor = Number(prod?.conversionFactor || 1);
      const baseQuantity = soldItem.unitType === 'PRIMARY' ? it.quantity * conversionFactor : it.quantity;
      const lineRefund = it.quantity * it.unitPrice;

      totalRefundValue += lineRefund;
      validatedItems.push({
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalRefund: lineRefund,
        baseQuantity,
      });
    }

    const returnNumber = `RET-POS-${Date.now().toString().slice(-8)}`;
    const effectiveReturnDate = returnDate ? new Date(returnDate) : new Date();

    const createdReturn = await prisma.$transaction(async (tx) => {
      let totalReplacementCostLoss = 0;

      // 1. Build structured reason & claim metadata
      let finalReason = reason.trim();
      if (isClaim) {
        // Calculate cost loss if replacement is given
        for (const vi of validatedItems) {
          const prod = await tx.product.findUnique({ where: { id: vi.productId } });
          if (prod) {
            totalReplacementCostLoss += vi.baseQuantity * Number(prod.purchasePrice);
          }
        }

        const claimMeta = {
          isClaim: true,
          resolution: claimResolution,
          claimStatus: 'IN_QUARANTINE',
          claimCategory,
          lossAmount: claimResolution === 'REPLACEMENT' ? totalReplacementCostLoss : 0,
          customerName: sale.customer.shopName,
          customerPhone: sale.customer.phone,
          originalInvoice: sale.invoiceNumber,
          dispositionHistory: [
            {
              status: 'IN_QUARANTINE',
              date: effectiveReturnDate.toISOString(),
              notes: claimResolution === 'REPLACEMENT'
                ? `Defective stock quarantined. Replacement unit given to customer. Cost Loss: Rs. ${totalReplacementCostLoss.toLocaleString()}`
                : `Defective stock quarantined. Refund / Credit of Rs. ${totalRefundValue.toLocaleString()} given to customer.`,
            },
          ],
        };

        finalReason = `[CLAIM_META:${JSON.stringify(claimMeta)}] ${reason.trim()}`;
      }

      // 2. Create Sales Return record
      const sReturn = await tx.salesReturn.create({
        data: {
          returnNumber,
          customerId: sale.customerId,
          saleId: sale.id,
          returnDate: effectiveReturnDate,
          totalRefund: new Prisma.Decimal(claimResolution === 'REPLACEMENT' && isClaim ? 0 : totalRefundValue),
          reason: finalReason,
          items: {
            create: validatedItems.map((vi) => ({
              productId: vi.productId,
              quantity: new Prisma.Decimal(vi.quantity),
              unitPrice: new Prisma.Decimal(vi.unitPrice),
              totalRefund: new Prisma.Decimal(claimResolution === 'REPLACEMENT' && isClaim ? 0 : vi.totalRefund),
            })),
          },
        },
        include: { items: true },
      });

      // 3. Stock Management Logic:
      if (isClaim && claimResolution === 'REPLACEMENT') {
        // CASE A: WARRANTY REPLACEMENT (نیا مال کسٹمر کو دینا)
        // - Defective returned item is NOT added to sellable stock (quarantined in claims register).
        // - Fresh replacement piece is DEDUCTED from active product stock!
        for (const vi of validatedItems) {
          const prod = await tx.product.findUnique({ where: { id: vi.productId } });
          if (!prod) continue;

          const curStock = Number(prod.currentStock);
          const newStock = curStock - vi.baseQuantity;

          await tx.product.update({
            where: { id: vi.productId },
            data: { currentStock: new Prisma.Decimal(newStock) },
          });

          await tx.stockMovement.create({
            data: {
              productId: vi.productId,
              movementType: MovementType.ADJUSTMENT,
              quantity: new Prisma.Decimal(vi.baseQuantity),
              previousStock: new Prisma.Decimal(curStock),
              newStock: new Prisma.Decimal(newStock),
              referenceId: sReturn.id,
              description: `Warranty Replacement given to customer for #${sale.invoiceNumber} (Defective item moved to Quarantine)`,
            },
          });
        }
        // Customer ledger is NOT touched for even replacement exchange (balance remains unchanged).
      } else if (isClaim && claimResolution === 'REFUND') {
        // CASE B: WARRANTY REFUND (خراب مال پر پیسے واپس یا کھاتہ کریڈٹ)
        // - Defective returned item is NOT added to sellable stock (quarantined).
        // - Customer receives ledger credit or cash refund.
        const balanceToCredit = totalRefundValue - refundAmount;
        const curCustomer = await tx.customer.findUnique({ where: { id: sale.customerId } });
        if (curCustomer) {
          const isWalkInCust = curCustomer.phone === '00000000000' || curCustomer.shopName.toLowerCase().includes('walk-in');
          const curReceivable = isWalkInCust ? 0 : Number(curCustomer.currentReceivable);
          const newReceivable = isWalkInCust ? 0 : (curReceivable - balanceToCredit);

          await tx.customer.update({
            where: { id: sale.customerId },
            data: { currentReceivable: new Prisma.Decimal(newReceivable) },
          });

          await tx.customerLedger.create({
            data: {
              customerId: sale.customerId,
              date: effectiveReturnDate,
              transactionType: TransactionType.SALE_RETURN,
              referenceId: sReturn.id,
              description: `Warranty Claim Refund #${returnNumber} (Inv #${sale.invoiceNumber}): ${reason}`,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(totalRefundValue),
              runningBalance: new Prisma.Decimal(curReceivable - totalRefundValue),
            },
          });

          if (refundAmount > 0) {
            await tx.customerLedger.create({
              data: {
                customerId: sale.customerId,
                date: effectiveReturnDate,
                transactionType: TransactionType.ADJUSTMENT,
                referenceId: sReturn.id,
                description: `Cash Refund given for Warranty Claim #${returnNumber}`,
                debit: new Prisma.Decimal(refundAmount),
                credit: new Prisma.Decimal(0),
                runningBalance: new Prisma.Decimal(newReceivable),
              },
            });
          }
        }
      } else {
        // CASE C: STANDARD RETURN (عام واپسی - سیل ایبل اسٹاک میں واپسی)
        for (const vi of validatedItems) {
          const prod = await tx.product.findUnique({ where: { id: vi.productId } });
          if (!prod) continue;

          const curStock = Number(prod.currentStock);
          const restoredStock = curStock + vi.baseQuantity;

          await tx.product.update({
            where: { id: vi.productId },
            data: { currentStock: new Prisma.Decimal(restoredStock) },
          });

          await tx.stockMovement.create({
            data: {
              productId: vi.productId,
              movementType: MovementType.SALE_RETURN,
              quantity: new Prisma.Decimal(vi.baseQuantity),
              previousStock: new Prisma.Decimal(curStock),
              newStock: new Prisma.Decimal(restoredStock),
              referenceId: sReturn.id,
              description: `Order Return #${returnNumber} for Inv #${sale.invoiceNumber} | Reason: ${reason}`,
            },
          });
        }

        const balanceToCredit = totalRefundValue - refundAmount;
        const curCustomer = await tx.customer.findUnique({ where: { id: sale.customerId } });
        if (curCustomer) {
          const isWalkInCust = curCustomer.phone === '00000000000' || curCustomer.shopName.toLowerCase().includes('walk-in');
          const curReceivable = isWalkInCust ? 0 : Number(curCustomer.currentReceivable);
          const newReceivable = isWalkInCust ? 0 : (curReceivable - balanceToCredit);

          await tx.customer.update({
            where: { id: sale.customerId },
            data: { currentReceivable: new Prisma.Decimal(newReceivable) },
          });

          await tx.customerLedger.create({
            data: {
              customerId: sale.customerId,
              date: effectiveReturnDate,
              transactionType: TransactionType.SALE_RETURN,
              referenceId: sReturn.id,
              description: `Sales Return #${returnNumber} (Inv #${sale.invoiceNumber}): ${reason}`,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(totalRefundValue),
              runningBalance: new Prisma.Decimal(curReceivable - totalRefundValue),
            },
          });

          if (refundAmount > 0) {
            await tx.customerLedger.create({
              data: {
                customerId: sale.customerId,
                date: effectiveReturnDate,
                transactionType: TransactionType.ADJUSTMENT,
                referenceId: sReturn.id,
                description: `Cash Refund given for Return #${returnNumber}`,
                debit: new Prisma.Decimal(refundAmount),
                credit: new Prisma.Decimal(0),
                runningBalance: new Prisma.Decimal(newReceivable),
              },
            });
          }
        }
      }

      return sReturn;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'SALES_RETURN_RECORDED',
      entityType: 'SALES_RETURN',
      entityId: createdReturn.id,
      details: {
        returnNumber,
        invoiceNumber: sale.invoiceNumber,
        reason,
        totalRefund: totalRefundValue,
        refundAmount,
      },
      ipAddress: req.ip,
    });

    clearProductsCache();
    clearDashboardCache();
    res.status(201).json({
      success: true,
      message: 'Sales return processed successfully and inventory restored',
      return: createdReturn,
    });
  } catch (error: any) {
    console.error('createSalesReturn error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process sales return' });
  }
};

// DELETE /api/sales/:id (Permanent Delete from DB and POS)
export const deleteSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale invoice not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. If sale was COMPLETED, safely restore product stock and revert customer receivable
      if (sale.status === OrderStatus.COMPLETED) {
        for (const item of sale.items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (prod) {
            const curStock = Number(prod.currentStock);
            const baseQty = Number(item.baseQuantity || item.quantity);
            await tx.product.update({
              where: { id: item.productId },
              data: { currentStock: new Prisma.Decimal(curStock + baseQty) },
            });
          }
        }

        // Revert customer receivable (subtract the remaining balance that was added when invoice was made)
        const curReceivable = Number(sale.customer.currentReceivable || 0);
        const rem = Number(sale.remainingBalance || 0);
        const newReceivable = curReceivable - rem;

        await tx.customer.update({
          where: { id: sale.customerId },
          data: { currentReceivable: new Prisma.Decimal(newReceivable) },
        });
      }

      // 2. Unlink any converted web orders
      await tx.webOrder.updateMany({
        where: { convertedSaleId: sale.id },
        data: { convertedSaleId: null },
      });

      // 3. Delete sales return items and sales returns linked to this sale
      await tx.salesReturnItem.deleteMany({
        where: { salesReturn: { saleId: sale.id } },
      });
      await tx.salesReturn.deleteMany({
        where: { saleId: sale.id },
      });

      // 4. Delete payment records for this invoice
      await tx.payment.deleteMany({
        where: { reference: sale.invoiceNumber },
      });

      // 5. Delete customer ledger entries linked to this sale
      await tx.customerLedger.deleteMany({
        where: { referenceId: sale.id },
      });

      // 6. Delete stock movement records linked to this sale
      await tx.stockMovement.deleteMany({
        where: { referenceId: sale.id },
      });

      // 7. Delete sale items
      await tx.saleItem.deleteMany({
        where: { saleId: sale.id },
      });

      // 8. Permanently delete the sale record
      await tx.sale.delete({
        where: { id: sale.id },
      });
    });

    await logAudit({
      userId: req.user?.id,
      action: 'SALE_DELETED',
      entityType: 'SALE',
      entityId: sale.id,
      details: {
        invoiceNumber: sale.invoiceNumber,
        customer: sale.customer.shopName,
        netAmount: sale.netAmount,
      },
      ipAddress: req.ip,
    });

    clearProductsCache();
    clearDashboardCache();
    res.json({
      success: true,
      message: `Invoice #${sale.invoiceNumber} was permanently deleted from database and POS. Stock & ledgers restored.`,
    });
  } catch (error: any) {
    console.error('deleteSale error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to permanently delete invoice' });
  }
};

// ============================================================================
// RECLAIMED LOOSE OIL DRUM MANAGEMENT (ڈرم کا کھلا آئل)
// ============================================================================
export const ensureReclaimedDrumProduct = async (tx?: any) => {
  const db = tx || prisma;
  let drumProd = await db.product.findFirst({
    where: {
      OR: [
        { sku: 'KHULA-RECLAIMED-DRUM' },
        { name: { contains: 'Reclaimed Mixed Oil Drum' } },
        { name: { contains: 'ڈرم کا کھلا آئل' } },
      ],
    },
    include: { unit: true, primaryUnit: true, category: true },
  });

  if (!drumProd) {
    let cat = await db.category.findFirst({ where: { name: 'LUBRICANT' } });
    if (!cat) cat = await db.category.findFirst();
    let unit = await db.unit.findFirst({ where: { OR: [{ symbol: 'Ltr' }, { name: 'Litre' }, { symbol: 'L' }] } });
    if (!unit) unit = await db.unit.findFirst();

    if (cat && unit) {
      drumProd = await db.product.create({
        data: {
          name: 'Reclaimed Mixed Oil Drum (ڈرم کا کھلا آئل)',
          sku: 'KHULA-RECLAIMED-DRUM',
          categoryId: cat.id,
          brand: 'RECLAIMED',
          unitId: unit.id,
          conversionFactor: new Prisma.Decimal(1),
          purchasePrice: new Prisma.Decimal(0),
          salePrice: new Prisma.Decimal(400),
          wholesalePrice: new Prisma.Decimal(380),
          minimumStockLevel: new Prisma.Decimal(20),
          currentStock: new Prisma.Decimal(0),
          description: 'Reclaimed loose engine oil collected from drums & warranty claim returns',
          showInCatalog: true,
          showPublicPrice: true,
          isActive: true,
        },
        include: { unit: true, primaryUnit: true, category: true },
      });
    }
  }

  return drumProd;
};

export const getReclaimedOilDrum = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const drum = await ensureReclaimedDrumProduct();
    if (!drum) {
      res.status(404).json({ success: false, message: 'Reclaimed oil drum product could not be initialized' });
      return;
    }
    res.json({
      success: true,
      drum: {
        id: drum.id,
        name: drum.name,
        sku: drum.sku,
        currentStock: Number(drum.currentStock),
        salePrice: Number(drum.salePrice),
        wholesalePrice: Number(drum.wholesalePrice),
        purchasePrice: Number(drum.purchasePrice),
        unit: drum.unit,
      },
    });
  } catch (error) {
    console.error('getReclaimedOilDrum error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve reclaimed oil drum status' });
  }
};

export const updateReclaimedDrumRate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { salePrice, wholesalePrice } = req.body;
    const drum = await ensureReclaimedDrumProduct();
    if (!drum) {
      res.status(404).json({ success: false, message: 'Drum not found' });
      return;
    }

    const updated = await prisma.product.update({
      where: { id: drum.id },
      data: {
        ...(salePrice !== undefined ? { salePrice: new Prisma.Decimal(Number(salePrice)) } : {}),
        ...(wholesalePrice !== undefined ? { wholesalePrice: new Prisma.Decimal(Number(wholesalePrice)) } : {}),
      },
    });

    clearProductsCache();
    res.json({ success: true, message: 'Reclaimed drum rate updated', drum: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update reclaimed drum rate' });
  }
};

export const dumpOilIntoReclaimedDrum = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { liters, notes } = req.body;
    const ltrNum = parseFloat(String(liters));
    if (isNaN(ltrNum) || ltrNum <= 0) {
      res.status(400).json({ success: false, message: 'Valid oil liters quantity is required' });
      return;
    }

    const drum = await ensureReclaimedDrumProduct();
    if (!drum) {
      res.status(404).json({ success: false, message: 'Reclaimed oil drum product not found' });
      return;
    }

    const curStock = Number(drum.currentStock);
    const newStock = curStock + ltrNum;

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: drum.id },
        data: { currentStock: new Prisma.Decimal(newStock) },
      });

      await tx.stockMovement.create({
        data: {
          productId: drum.id,
          movementType: MovementType.PURCHASE,
          quantity: new Prisma.Decimal(ltrNum),
          previousStock: new Prisma.Decimal(curStock),
          newStock: new Prisma.Decimal(newStock),
          description: `Manual loose oil dumped into drum: ${ltrNum} Liters. Note: ${notes || 'Shop dump'}`,
        },
      });
    });

    await logAudit({
      userId: req.user?.id,
      action: 'RECLAIMED_DRUM_DUMP',
      entityType: 'PRODUCT',
      entityId: drum.id,
      details: { litersAdded: ltrNum, previousStock: curStock, newStock, notes },
      ipAddress: req.ip,
    });

    clearProductsCache();
    res.json({
      success: true,
      message: `${ltrNum} Liters oil kamyabi se Reclaimed Drum me shamil ho gaya!`,
      currentStock: newStock,
    });
  } catch (error: any) {
    console.error('dumpOilIntoReclaimedDrum error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to dump oil into drum' });
  }
};

// ============================================================================
// PENDING / PARTIAL DELIVERY TRACKING (امانت و بعد میں سامان کی حوالگی)
// ============================================================================
export const getPendingDeliveries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sales = await prisma.sale.findMany({
      where: {
        status: { not: OrderStatus.CANCELLED },
        notes: { contains: '"status":"PENDING_DELIVERY"' },
      },
      include: {
        customer: { select: { id: true, shopName: true, ownerName: true, phone: true, area: true } },
        salesman: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true, primaryUnit: true } },
          },
        },
      },
      orderBy: { saleDate: 'desc' },
      take: 100,
    });

    const pendingDeliveries = sales
      .map((sale) => {
        let meta: any = null;
        try {
          const match = (sale.notes || '').match(/\[DELIVERY_META:(.*?)\]/);
          if (match) meta = JSON.parse(match[1]);
        } catch (e) { }

        const pendingItems = (meta?.items || sale.items || []).filter((it: any) => it.status !== 'DELIVERED');

        return {
          saleId: sale.id,
          invoiceNumber: sale.invoiceNumber,
          saleDate: sale.saleDate,
          customer: sale.customer,
          salesman: sale.salesman,
          totalAmount: Number(sale.totalAmount),
          netAmount: Number(sale.netAmount),
          receivedAmount: Number(sale.receivedAmount),
          remainingBalance: Number(sale.remainingBalance),
          deliveryStatus: meta?.status || 'PENDING_DELIVERY',
          pendingItems: pendingItems.map((pi: any) => {
            const matchedItem = sale.items.find((si) => si.productId === pi.productId);
            return {
              productId: pi.productId,
              productName: pi.productName || matchedItem?.product?.name || 'Product',
              sku: matchedItem?.product?.sku || '',
              quantity: Number(pi.quantity || matchedItem?.quantity || 0),
              unitType: pi.unitType || matchedItem?.unitType || 'SECONDARY',
              unitSymbol: matchedItem?.product?.unit?.symbol || 'Pcs',
              status: pi.status || 'PENDING_DELIVERY',
            };
          }),
          createdAt: sale.createdAt,
          userNotes: (sale.notes || '').replace(/\[DELIVERY_META:.*?\]\s*/, '').trim(),
        };
      })
      .filter((s) => s.deliveryStatus === 'PENDING_DELIVERY' && s.pendingItems.length > 0);

    res.json({ success: true, count: pendingDeliveries.length, data: pendingDeliveries });
  } catch (error) {
    console.error('getPendingDeliveries error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve pending deliveries' });
  }
};

export const updateDeliveryStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { deliveredItemIds, markAllDelivered = true, deliveryNotes } = req.body;

    const sale = await prisma.sale.findFirst({
      where: { OR: [{ id }, { invoiceNumber: id }] },
      include: { customer: true, items: { include: { product: true } } },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Sale invoice not found' });
      return;
    }

    let meta: any = { status: 'PENDING_DELIVERY', items: [] };
    const notesStr = sale.notes || '';
    const match = notesStr.match(/\[DELIVERY_META:(.*?)\]/);
    if (match) {
      try {
        meta = JSON.parse(match[1]);
      } catch (e) { }
    } else {
      meta.items = sale.items.map((it) => ({
        productId: it.productId,
        productName: it.product.name,
        quantity: Number(it.quantity),
        unitType: it.unitType,
        status: 'PENDING_DELIVERY',
      }));
    }

    if (markAllDelivered) {
      meta.status = 'DELIVERED';
      meta.items = (meta.items || []).map((it: any) => ({ ...it, status: 'DELIVERED' }));
      meta.deliveredAt = new Date().toISOString();
    } else if (Array.isArray(deliveredItemIds)) {
      meta.items = (meta.items || []).map((it: any) => {
        if (deliveredItemIds.includes(it.productId)) {
          return { ...it, status: 'DELIVERED' };
        }
        return it;
      });
      const allDone = meta.items.every((it: any) => it.status === 'DELIVERED');
      meta.status = allDone ? 'DELIVERED' : 'PENDING_DELIVERY';
      if (allDone) meta.deliveredAt = new Date().toISOString();
    }

    const cleanUserNotes = notesStr.replace(/\[DELIVERY_META:.*?\]\s*/, '').trim();
    const updatedNotes = `[DELIVERY_META:${JSON.stringify(meta)}] ${cleanUserNotes}${deliveryNotes ? ` (Delivered Note: ${deliveryNotes})` : ''}`.trim();

    await prisma.sale.update({
      where: { id: sale.id },
      data: { notes: updatedNotes },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'DELIVERY_STATUS_UPDATED',
      entityType: 'SALE',
      entityId: sale.id,
      details: {
        invoiceNumber: sale.invoiceNumber,
        newStatus: meta.status,
        deliveredItemsCount: (meta.items || []).filter((it: any) => it.status === 'DELIVERED').length,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: meta.status === 'DELIVERED' ? 'All items marked as delivered successfully!' : 'Delivery status updated',
      deliveryStatus: meta.status,
    });
  } catch (error) {
    console.error('updateDeliveryStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update delivery status' });
  }
};

// ============================================================================
// WARRANTY CLAIMS & DEFECTIVE STORE (وارنٹی کلیمز و خراب اسٹاک)
// ============================================================================
export const getClaimsList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const returns = await prisma.salesReturn.findMany({
      where: {
        reason: { contains: '[CLAIM_META:' },
      },
      include: {
        customer: { select: { id: true, shopName: true, ownerName: true, phone: true } },
        sale: { select: { id: true, invoiceNumber: true, saleDate: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                brand: true,
                purchasePrice: true,
                salePrice: true,
                conversionFactor: true,
                unit: true,
                primaryUnit: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { returnDate: 'desc' },
      take: 200,
    });

    let totalClaimLoss = 0;
    let quarantinedCount = 0;

    const claims = returns.map((ret) => {
      let meta: any = {};
      try {
        const match = (ret.reason || '').match(/\[CLAIM_META:(.*?)\]/);
        if (match) meta = JSON.parse(match[1]);
      } catch (e) { }

      const loss = Number(meta.lossAmount || 0);
      totalClaimLoss += loss;
      if (meta.claimStatus === 'IN_QUARANTINE') quarantinedCount++;

      return {
        id: ret.id,
        returnNumber: ret.returnNumber,
        originalInvoice: ret.sale?.invoiceNumber || meta.originalInvoice || 'N/A',
        returnDate: ret.returnDate,
        customer: ret.customer,
        claimStatus: meta.claimStatus || 'IN_QUARANTINE',
        claimCategory: meta.claimCategory || 'NON_OIL',
        resolution: meta.resolution || 'REPLACEMENT',
        lossAmount: loss,
        totalRefund: Number(ret.totalRefund),
        items: ret.items.map((it) => ({
          id: it.id,
          productId: it.productId,
          productName: it.product?.name || 'Product',
          sku: it.product?.sku || '',
          brand: it.product?.brand || '',
          category: it.product?.category?.name || 'General',
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          costPrice: Number(it.product?.purchasePrice || 0),
          conversionFactor: Number(it.product?.conversionFactor || 1),
          unitSymbol: it.product?.unit?.symbol || 'Pcs',
        })),
        dispositionHistory: meta.dispositionHistory || [],
        dumpVoucher: meta.dumpVoucher || null,
        notes: (ret.reason || '').replace(/\[CLAIM_META:.*?\]\s*/, '').trim(),
      };
    });

    res.json({
      success: true,
      claims,
      summary: {
        totalClaims: claims.length,
        quarantinedCount,
        totalClaimLoss,
      },
    });
  } catch (error) {
    console.error('getClaimsList error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve claims list' });
  }
};

export const updateClaimDisposition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, dispositionNotes, dumpLiters } = req.body;

    const sReturn = await prisma.salesReturn.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });

    if (!sReturn) {
      res.status(404).json({ success: false, message: 'Warranty claim record not found' });
      return;
    }

    let meta: any = {};
    const reasonStr = sReturn.reason || '';
    const match = reasonStr.match(/\[CLAIM_META:(.*?)\]/);
    if (match) {
      try {
        meta = JSON.parse(match[1]);
      } catch (e) { }
    }

    const effectiveDate = new Date();
    let newStatus = meta.claimStatus || 'IN_QUARANTINE';
    let actionLog = '';

    await prisma.$transaction(async (tx) => {
      if (action === 'SENT_TO_COMPANY') {
        newStatus = 'SENT_TO_COMPANY';
        actionLog = `Sent to company / vendor for warranty. Notes: ${dispositionNotes || 'Dispatched'}`;
      } else if (action === 'COMPANY_REPLACED' || action === 'REPAIRED_RESTORED') {
        // Restores units back to active sellable inventory
        for (const it of sReturn.items) {
          const prod = await tx.product.findUnique({ where: { id: it.productId } });
          if (prod) {
            const curStock = Number(prod.currentStock);
            const qty = Number(it.quantity);
            const restoredStock = curStock + qty;

            await tx.product.update({
              where: { id: it.productId },
              data: { currentStock: new Prisma.Decimal(restoredStock) },
            });

            await tx.stockMovement.create({
              data: {
                productId: it.productId,
                movementType: MovementType.PURCHASE,
                quantity: new Prisma.Decimal(qty),
                previousStock: new Prisma.Decimal(curStock),
                newStock: new Prisma.Decimal(restoredStock),
                referenceId: sReturn.id,
                description: `Warranty Claim #${sReturn.returnNumber}: ${action === 'COMPANY_REPLACED' ? 'Replaced by company with new unit' : 'Repaired and restored to stock'}`,
              },
            });
          }
        }
        newStatus = action === 'COMPANY_REPLACED' ? 'RESOLVED_REPLACED' : 'RESOLVED_RESTOCKED';
        meta.lossAmount = 0; // Loss recovered
        actionLog = action === 'COMPANY_REPLACED' ? 'Company replaced with brand new stock. Active inventory restored.' : 'Repaired and restored to active stock.';
      } else if (action === 'SCRAP_LOSS') {
        newStatus = 'SCRAPPED_LOSS';
        actionLog = `Scrapped / discarded as total defective loss. Notes: ${dispositionNotes || 'Scrap'}`;
      } else if (action === 'DUMP_IN_DRUM') {
        // Dumps claimed oil into Reclaimed Loose Oil Drum
        const drum = await ensureReclaimedDrumProduct(tx);
        if (!drum) throw new Error('Reclaimed oil drum product could not be initialized');

        const litersToAdd = dumpLiters && Number(dumpLiters) > 0
          ? Number(dumpLiters)
          : sReturn.items.reduce((sum, it) => {
            const conv = Number(it.product.conversionFactor || 1);
            return sum + (Number(it.quantity) * conv);
          }, 0);

        const curDrumStock = Number(drum.currentStock);
        const newDrumStock = curDrumStock + litersToAdd;
        const drumSalePrice = Number(drum.salePrice || 0);
        const voucherNumber = `ROT-DRM-CLM-${Date.now().toString().slice(-6)}`;

        await tx.product.update({
          where: { id: drum.id },
          data: { currentStock: new Prisma.Decimal(newDrumStock) },
        });

        await tx.stockMovement.create({
          data: {
            productId: drum.id,
            movementType: MovementType.PURCHASE,
            quantity: new Prisma.Decimal(litersToAdd),
            previousStock: new Prisma.Decimal(curDrumStock),
            newStock: new Prisma.Decimal(newDrumStock),
            referenceId: sReturn.id,
            description: `Claim #${sReturn.returnNumber} oil dumped into drum (${litersToAdd} Ltr) - Voucher #${voucherNumber}`,
          },
        });

        const dumpVoucher = {
          voucherNumber,
          voucherDate: effectiveDate.toISOString(),
          claimId: sReturn.id,
          returnNumber: sReturn.returnNumber,
          originalInvoice: meta.originalInvoice || 'N/A',
          customerShop: sReturn.customer?.shopName || 'Customer Shop',
          customerOwner: sReturn.customer?.ownerName || '',
          customerPhone: sReturn.customer?.phone || '',
          customerArea: (sReturn.customer as any)?.area || '',
          litersDumped: litersToAdd,
          previousStock: curDrumStock,
          newStock: newDrumStock,
          drumRate: drumSalePrice,
          salvageValue: litersToAdd * drumSalePrice,
          salvagedProducts: sReturn.items.map((it: any) => ({
            name: it.product.name,
            sku: it.product.sku,
            quantity: Number(it.quantity),
            unitSymbol: it.product.unit?.symbol || 'Pcs',
          })),
          notes: dispositionNotes || 'Claimed defective oil dumped into Reclaimed Loose Oil Drum',
          operatorName: req.user?.fullName || req.user?.username || 'Admin / Operator',
        };

        meta.dumpVoucher = dumpVoucher;
        newStatus = 'DUMPED_IN_DRUM';
        actionLog = `Dumped ${litersToAdd} Liters of claimed oil into Reclaimed Oil Drum (Voucher #${voucherNumber}). Stock increased to ${newDrumStock} Ltr.`;
      }

      meta.claimStatus = newStatus;
      if (!Array.isArray(meta.dispositionHistory)) meta.dispositionHistory = [];
      meta.dispositionHistory.push({
        status: newStatus,
        date: effectiveDate.toISOString(),
        notes: actionLog,
      });

      const cleanReason = reasonStr.replace(/\[CLAIM_META:.*?\]\s*/, '').trim();
      const newReason = `[CLAIM_META:${JSON.stringify(meta)}] ${cleanReason}`;

      await tx.salesReturn.update({
        where: { id: sReturn.id },
        data: { reason: newReason },
      });
    });

    clearProductsCache();
    clearDashboardCache();

    res.json({
      success: true,
      message: meta.dumpVoucher
        ? `Liters oil kamyabi se drum me dump ho gaya! Inward Voucher #${meta.dumpVoucher.voucherNumber} generate ho chuki hai.`
        : 'Claim disposition successfully updated',
      status: newStatus,
      dumpVoucher: meta.dumpVoucher || null,
    });
  } catch (error: any) {
    console.error('updateClaimDisposition error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update claim disposition' });
  }
};


