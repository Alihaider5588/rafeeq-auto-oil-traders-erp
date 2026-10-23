import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { MovementType, OrderStatus, PaymentMethod, Role, TransactionType } from '../types/enums';
import { Prisma } from '@prisma/client';

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unitPrice: z.number().positive('Unit price must be positive'),
  unitType: z.enum(['PRIMARY', 'SECONDARY']).default('SECONDARY').optional(),
});

const saleSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  salesmanId: z.string().min(1).optional().nullable(),
  saleDate: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  discount: z.number().min(0).default(0),
  receivedAmount: z.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().optional().nullable(),
  clientReferenceId: z.string().optional(), // Idempotency key from salesman mobile
});

export const getSales = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, salesmanId, status, startDate, endDate, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.SaleWhereInput = {};

    if (req.user?.role === Role.SALESMAN) {
      where.salesmanId = req.user.id;
    } else {
      if (salesmanId) where.salesmanId = salesmanId as string;
    }

    if (customerId) where.customerId = customerId as string;
    if (status) where.status = status as string;
    if (startDate || endDate) {
      where.saleDate = {
        ...(startDate ? { gte: new Date(startDate as string) } : {}),
        ...(endDate ? { lte: new Date(endDate as string) } : {}),
      };
    }

    const [total, sales] = await Promise.all([
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
                include: {
                  unit: true,
                  primaryUnit: true,
                },
              },
            },
          },
        },
        orderBy: { saleDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      success: true,
      data: sales,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
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
    const sale = await prisma.sale.findUnique({
      where: { id },
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

// Customer/Party-Wise Product Rate History lookup
export const getCustomerProductRate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, productId, unitType = 'SECONDARY' } = req.query;

    if (!customerId || !productId) {
      res.status(400).json({ success: false, message: 'customerId and productId are required' });
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

    res.json({
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
    });
  } catch (error) {
    console.error('getCustomerProductRate error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve rate history' });
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
      const totalPrice = item.quantity * item.unitPrice;
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

    const netAmount = totalSaleAmount - data.discount;
    const remainingBalance = netAmount - data.receivedAmount;
    const totalGrossProfit = netAmount - totalSaleCost;

    const invoiceNumber = `ROT-INV-${Date.now().toString().slice(-8)}`;
    const orderStatus = requireApproval ? OrderStatus.PENDING_APPROVAL : OrderStatus.COMPLETED;
    const saleDate = data.saleDate ? new Date(data.saleDate) : new Date();

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
          discount: new Prisma.Decimal(data.discount),
          netAmount: new Prisma.Decimal(netAmount),
          receivedAmount: new Prisma.Decimal(data.receivedAmount),
          remainingBalance: new Prisma.Decimal(remainingBalance),
          totalCost: new Prisma.Decimal(totalSaleCost),
          grossProfit: new Prisma.Decimal(totalGrossProfit),
          paymentMethod: data.paymentMethod,
          status: orderStatus,
          notes: data.notes,
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
        // 2. Reduce Stock automatically using BASE QUANTITY
        for (const it of itemDetails) {
          const newStock = it.currentStock - it.baseQuantity;

          await tx.product.update({
            where: { id: it.productId },
            data: { currentStock: new Prisma.Decimal(newStock) },
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

        // Batch create all stock movements in 1 single query
        await tx.stockMovement.createMany({
          data: itemDetails.map((it) => ({
            productId: it.productId,
            movementType: MovementType.SALE,
            quantity: new Prisma.Decimal(it.baseQuantity),
            previousStock: new Prisma.Decimal(it.currentStock),
            newStock: new Prisma.Decimal(it.currentStock - it.baseQuantity),
            referenceId: sale.id,
            description: `Sale Inv #${invoiceNumber} (${it.quantity} ${it.unitType})`,
          })),
        });

        // 4. Update Customer Ledger & Current Receivable
        const currentReceivable = Number(customer.currentReceivable);
        const newReceivable = currentReceivable + remainingBalance;

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
      const totalPrice = item.quantity * item.unitPrice;
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

    const netAmount = totalSaleAmount - data.discount;
    const remainingBalance = netAmount - data.receivedAmount;
    const totalGrossProfit = netAmount - totalSaleCost;
    const saleDate = data.saleDate ? new Date(data.saleDate) : existingSale.saleDate;

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
          const oldReceivable = Number(oldCust.currentReceivable);
          const oldRemaining = Number(existingSale.remainingBalance);
          const reversedReceivable = oldReceivable - oldRemaining;

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
          discount: new Prisma.Decimal(data.discount),
          netAmount: new Prisma.Decimal(netAmount),
          receivedAmount: new Prisma.Decimal(data.receivedAmount),
          remainingBalance: new Prisma.Decimal(remainingBalance),
          totalCost: new Prisma.Decimal(totalSaleCost),
          grossProfit: new Prisma.Decimal(totalGrossProfit),
          paymentMethod: data.paymentMethod,
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
          const curReceivable = Number(freshCust.currentReceivable);
          const newReceivable = curReceivable + remainingBalance;

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
  reason: z.string().min(1, 'Reason for return is required'), // Damaged, Wrong Viscosity/Item, Customer Cancelled, etc.
  items: z.array(returnItemSchema).min(1, 'At least one item to return is required'),
  refundAmount: z.number().min(0).default(0), // Cash refunded back or 0 to credit customer ledger
  returnDate: z.string().optional(),
});

export const createSalesReturn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = salesReturnSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const { saleId, reason, items, refundAmount, returnDate } = parsed.data;

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
      // 1. Create Sales Return record
      const sReturn = await tx.salesReturn.create({
        data: {
          returnNumber,
          customerId: sale.customerId,
          saleId: sale.id,
          returnDate: effectiveReturnDate,
          totalRefund: new Prisma.Decimal(totalRefundValue),
          reason: reason.trim(),
          items: {
            create: validatedItems.map((vi) => ({
              productId: vi.productId,
              quantity: new Prisma.Decimal(vi.quantity),
              unitPrice: new Prisma.Decimal(vi.unitPrice),
              totalRefund: new Prisma.Decimal(vi.totalRefund),
            })),
          },
        },
        include: { items: true },
      });

      // 2. Restore Stock into Product Inventory
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

      // 3. Customer Ledger Adjustments:
      const balanceToCredit = totalRefundValue - refundAmount;
      const curCustomer = await tx.customer.findUnique({ where: { id: sale.customerId } });
      if (curCustomer) {
        const curReceivable = Number(curCustomer.currentReceivable);
        const newReceivable = curReceivable - balanceToCredit;

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

        // If cash was actually paid out from cash drawer to customer
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
