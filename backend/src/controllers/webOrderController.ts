import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { MovementType, Role } from '../types/enums';
import { Prisma } from '@prisma/client';

// GET /api/sales/web-orders
export const getWebOrdersQueue = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orders = await prisma.webOrder.findMany({
      include: {
        items: {
          include: {
            product: {
              include: { unit: true, primaryUnit: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve online web orders' });
  }
};

// POST /api/sales/web-orders/:id/confirm
export const confirmWebOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { customerId: providedCustomerId } = req.body;

    const webOrder = await prisma.webOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!webOrder) {
      res.status(404).json({ success: false, message: 'Web order not found' });
      return;
    }

    if (webOrder.status !== 'PENDING') {
      res.status(400).json({ success: false, message: `Order is already '${webOrder.status}'` });
      return;
    }

    // 1. Resolve or create customer in POS
    let customerId = providedCustomerId;
    if (!customerId) {
      // Find customer by phone or create a new customer profile
      let existingCust = await prisma.customer.findUnique({
        where: { phone: webOrder.phone },
      });

      if (!existingCust) {
        existingCust = await prisma.customer.create({
          data: {
            shopName: webOrder.shopName || `${webOrder.customerName}'s Workshop`,
            ownerName: webOrder.customerName,
            phone: webOrder.phone,
            address: webOrder.deliveryAddress || webOrder.cityArea || 'Online Website Customer',
            area: webOrder.cityArea || 'Website',
          },
        });
      }
      customerId = existingCust.id;
    }

    // 2. Convert to confirmed Sale transaction with stock deduction
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    let totalSaleAmount = 0;
    let totalSaleCost = 0;

    const itemDetails: any[] = [];
    for (const it of webOrder.items) {
      const prod = await prisma.product.findUnique({ where: { id: it.productId } });
      if (!prod) continue;

      const conv = Number(prod.conversionFactor || 1);
      const baseQty = it.unitType === 'PRIMARY' ? Number(it.quantity) * conv : Number(it.quantity);
      const lineCost = baseQty * Number(prod.purchasePrice);
      const lineTotal = Number(it.totalPrice);

      totalSaleAmount += lineTotal;
      totalSaleCost += lineCost;

      itemDetails.push({
        productId: it.productId,
        quantity: Number(it.quantity),
        unitType: it.unitType,
        baseQuantity: baseQty,
        unitPrice: Number(it.unitPrice),
        unitCost: Number(prod.purchasePrice),
        totalPrice: lineTotal,
        profit: lineTotal - lineCost,
      });
    }

    const grossProfit = totalSaleAmount - totalSaleCost;

    const confirmedSale = await prisma.$transaction(async (tx) => {
      // Create confirmed Sale invoice
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId,
          createdById: req.user!.id,
          totalAmount: new Prisma.Decimal(totalSaleAmount),
          discount: new Prisma.Decimal(0),
          netAmount: new Prisma.Decimal(totalSaleAmount),
          receivedAmount: new Prisma.Decimal(0),
          remainingBalance: new Prisma.Decimal(totalSaleAmount),
          totalCost: new Prisma.Decimal(totalSaleCost),
          grossProfit: new Prisma.Decimal(grossProfit),
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          notes: `Confirmed from Online Web Order #${webOrder.orderNumber}. Note: ${webOrder.notes || ''}`,
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

      // Deduct stock for each item
      for (const it of itemDetails) {
        const prod = await tx.product.findUnique({ where: { id: it.productId } });
        if (prod) {
          const cur = Number(prod.currentStock);
          const nxt = cur - it.baseQuantity;

          await tx.product.update({
            where: { id: it.productId },
            data: { currentStock: new Prisma.Decimal(nxt) },
          });

          await tx.stockMovement.create({
            data: {
              productId: it.productId,
              movementType: MovementType.SALE,
              quantity: new Prisma.Decimal(it.baseQuantity),
              previousStock: new Prisma.Decimal(cur),
              newStock: new Prisma.Decimal(nxt),
              referenceId: sale.id,
              description: `Online Order Placed #${webOrder.orderNumber} (Invoice #${invoiceNumber})`,
            },
          });
        }
      }

      // Add to Customer Ledger (Receivable)
      const cust = await tx.customer.findUnique({ where: { id: customerId } });
      const currentRec = Number(cust?.currentReceivable || 0);
      const newRec = currentRec + totalSaleAmount;

      await tx.customer.update({
        where: { id: customerId },
        data: { currentReceivable: new Prisma.Decimal(newRec) },
      });

      await tx.customerLedger.create({
        data: {
          customerId,
          date: new Date(),
          transactionType: 'INVOICE',
          referenceId: sale.id,
          description: `Online Order #${webOrder.orderNumber} Confirmed`,
          debit: new Prisma.Decimal(totalSaleAmount),
          credit: new Prisma.Decimal(0),
          runningBalance: new Prisma.Decimal(newRec),
        },
      });

      // Update WebOrder status to CONFIRMED
      await tx.webOrder.update({
        where: { id: webOrder.id },
        data: {
          status: 'CONFIRMED',
          convertedSaleId: sale.id,
          confirmedById: req.user!.id,
          confirmedAt: new Date(),
        },
      });

      return sale;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'WEB_ORDER_CONFIRMED',
      entityType: 'SALE',
      entityId: confirmedSale.id,
      details: { orderNumber: webOrder.orderNumber, invoiceNumber },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Web Order #${webOrder.orderNumber} successfully confirmed and placed as Invoice #${invoiceNumber}!`,
      sale: confirmedSale,
    });
  } catch (error) {
    console.error('confirmWebOrder error:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm and place web order' });
  }
};

// POST /api/sales/web-orders/:id/reject
export const rejectWebOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const webOrder = await prisma.webOrder.findUnique({ where: { id } });
    if (!webOrder) {
      res.status(404).json({ success: false, message: 'Web order not found' });
      return;
    }

    const updated = await prisma.webOrder.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: reason ? `${webOrder.notes || ''} [Rejected: ${reason}]`.trim() : webOrder.notes,
        confirmedById: req.user?.id,
        confirmedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Web order marked as rejected', order: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject web order' });
  }
};
