import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { MovementType, PaymentMethod, TransactionType } from '../types/enums';
import { Prisma } from '@prisma/client';

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitCost: z.number().positive('Unit cost must be positive'),
  unitType: z.enum(['PRIMARY', 'SECONDARY']).default('SECONDARY').optional(),
});

const purchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  invoiceNumber: z.string().min(1, 'Supplier invoice number is required'),
  purchaseDate: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().optional().nullable(),
});

export const getPurchases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { supplierId, startDate, endDate, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.PurchaseWhereInput = {};

    if (supplierId) where.supplierId = supplierId as string;
    if (startDate || endDate) {
      where.purchaseDate = {
        ...(startDate ? { gte: new Date(startDate as string) } : {}),
        ...(endDate ? { lte: new Date(endDate as string) } : {}),
      };
    }

    const [total, purchases] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({
        where,
        include: {
          supplier: true,
          createdBy: { select: { id: true, fullName: true, username: true } },
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
        orderBy: { purchaseDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('getPurchases error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve purchases' });
  }
};

export const createPurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = purchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const userId = req.user!.id;

    // Check duplicate invoice
    const existing = await prisma.purchase.findUnique({
      where: { invoiceNumber: data.invoiceNumber.trim() },
    });
    if (existing) {
      res.status(400).json({ success: false, message: 'Purchase invoice number already exists' });
      return;
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found' });
      return;
    }

    // Calculate item costs and base quantities
    let totalItemsCost = 0;
    const processedItems: Array<{
      productId: string;
      quantity: number;
      unitType: string;
      baseQuantity: number;
      unitCost: number;
      totalCost: number;
      baseUnitCost: number;
      prevStock: number;
      newStock: number;
      productName: string;
    }> = [];

    for (const item of data.items) {
      const prod = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { unit: true, primaryUnit: true },
      });
      if (!prod) {
        res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
        return;
      }

      const unitType = item.unitType === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY';
      const conversionFactor = Number(prod.conversionFactor || 1);
      const baseQuantity = unitType === 'PRIMARY' ? item.quantity * conversionFactor : item.quantity;
      const totalCost = item.quantity * item.unitCost;
      const baseUnitCost = unitType === 'PRIMARY' ? item.unitCost / conversionFactor : item.unitCost;

      totalItemsCost += totalCost;

      const prevStock = Number(prod.currentStock);
      const newStock = prevStock + baseQuantity;

      processedItems.push({
        productId: prod.id,
        quantity: item.quantity,
        unitType,
        baseQuantity,
        unitCost: item.unitCost,
        totalCost,
        baseUnitCost,
        prevStock,
        newStock,
        productName: prod.name,
      });
    }

    const netAmount = totalItemsCost - data.discount + data.tax;
    const remainingAmount = netAmount - data.paidAmount;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase record
      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber: data.invoiceNumber.trim(),
          supplierId: data.supplierId,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
          totalAmount: new Prisma.Decimal(totalItemsCost),
          discount: new Prisma.Decimal(data.discount),
          tax: new Prisma.Decimal(data.tax),
          netAmount: new Prisma.Decimal(netAmount),
          paidAmount: new Prisma.Decimal(data.paidAmount),
          remainingAmount: new Prisma.Decimal(remainingAmount),
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          createdById: userId,
          items: {
            create: processedItems.map((item) => ({
              productId: item.productId,
              quantity: new Prisma.Decimal(item.quantity),
              unitType: item.unitType,
              baseQuantity: new Prisma.Decimal(item.baseQuantity),
              unitCost: new Prisma.Decimal(item.unitCost),
              totalCost: new Prisma.Decimal(item.totalCost),
            })),
          },
        },
        include: { items: true },
      });

      // 2. Automatically Increase Stock using BASE QUANTITY
      for (const item of processedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: new Prisma.Decimal(item.newStock),
            purchasePrice: new Prisma.Decimal(item.baseUnitCost), // Track per base unit cost
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            movementType: MovementType.PURCHASE,
            quantity: new Prisma.Decimal(item.baseQuantity),
            previousStock: new Prisma.Decimal(item.prevStock),
            newStock: new Prisma.Decimal(item.newStock),
            referenceId: purchase.id,
            description: `Purchase Inward Inv #${data.invoiceNumber} (${item.quantity} ${item.unitType})`,
          },
        });
      }

      // 3. Update Supplier Ledger & Current Payable
      const currentPayable = Number(supplier.currentPayable);
      const newPayable = currentPayable + remainingAmount;

      await tx.supplier.update({
        where: { id: supplier.id },
        data: { currentPayable: new Prisma.Decimal(newPayable) },
      });

      await tx.supplierLedger.create({
        data: {
          supplierId: supplier.id,
          date: purchase.purchaseDate,
          transactionType: TransactionType.PURCHASE_INVOICE,
          referenceId: purchase.id,
          description: `Purchase Bill #${data.invoiceNumber}`,
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(netAmount),
          runningBalance: new Prisma.Decimal(currentPayable + netAmount),
        },
      });

      // If payment was paid:
      if (data.paidAmount > 0) {
        await tx.supplierLedger.create({
          data: {
            supplierId: supplier.id,
            date: purchase.purchaseDate,
            transactionType: TransactionType.SUPPLIER_PAYMENT,
            referenceId: purchase.id,
            description: `Payment for Bill #${data.invoiceNumber} (${data.paymentMethod})`,
            debit: new Prisma.Decimal(data.paidAmount),
            credit: new Prisma.Decimal(0),
            runningBalance: new Prisma.Decimal(newPayable),
          },
        });

        await tx.payment.create({
          data: {
            receiptNumber: `PAY-SUP-${Date.now().toString().slice(-8)}`,
            supplierId: supplier.id,
            amount: new Prisma.Decimal(data.paidAmount),
            paymentMethod: data.paymentMethod,
            reference: data.invoiceNumber,
            notes: `Paid on inward bill #${data.invoiceNumber}`,
            recordedById: userId,
          },
        });
      }

      return purchase;
    });

    await logAudit({
      userId,
      action: 'PURCHASE_RECORDED',
      entityType: 'PURCHASE',
      entityId: result.id,
      details: {
        invoiceNumber: data.invoiceNumber,
        supplier: supplier.companyName,
        netAmount,
        paidAmount: data.paidAmount,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Inward purchase saved and stock updated',
      purchase: result,
    });
  } catch (error: any) {
    console.error('createPurchase error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to record purchase' });
  }
};
