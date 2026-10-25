import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { PaymentMethod, TransactionType } from '../types/enums';
import { Prisma } from '@prisma/client';
import { clearDashboardCache } from './reportController';

const paymentSchema = z.object({
  customerId: z.string().min(1).optional().nullable(),
  supplierId: z.string().min(1).optional().nullable(),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const getCustomerLedger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate } = req.query;

    const where: Prisma.CustomerLedgerWhereInput = { customerId };
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate as string) } : {}),
        ...(endDate ? { lte: new Date(endDate as string) } : {}),
      };
    }

    const [customer, entries] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        include: { salesman: true },
      }),
      prisma.customerLedger.findMany({
        where,
        orderBy: { date: 'asc' },
      }),
    ]);

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;
    entries.forEach((e) => {
      totalDebit += Number(e.debit);
      totalCredit += Number(e.credit);
    });

    res.json({
      success: true,
      customer,
      summary: {
        totalDebit,
        totalCredit,
        currentReceivable: Number(customer.currentReceivable),
      },
      entries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customer ledger' });
  }
};

export const getSupplierLedger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { supplierId } = req.params;
    const { startDate, endDate } = req.query;

    const where: Prisma.SupplierLedgerWhereInput = { supplierId };
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate as string) } : {}),
        ...(endDate ? { lte: new Date(endDate as string) } : {}),
      };
    }

    const [supplier, entries] = await Promise.all([
      prisma.supplier.findUnique({ where: { id: supplierId } }),
      prisma.supplierLedger.findMany({
        where,
        orderBy: { date: 'asc' },
      }),
    ]);

    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found' });
      return;
    }

    let totalDebit = 0;
    let totalCredit = 0;
    entries.forEach((e) => {
      totalDebit += Number(e.debit);
      totalCredit += Number(e.credit);
    });

    res.json({
      success: true,
      supplier,
      summary: {
        totalDebit,
        totalCredit,
        currentPayable: Number(supplier.currentPayable),
      },
      entries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch supplier ledger' });
  }
};

export const recordPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const userId = req.user!.id;

    if (!data.customerId && !data.supplierId) {
      res.status(400).json({ success: false, message: 'Either customerId or supplierId must be provided' });
      return;
    }

    const receiptNumber = `PAY-${Date.now().toString().slice(-8)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Customer Payment (Collection)
      if (data.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (!customer) throw new Error('Customer not found');

        const curRec = Number(customer.currentReceivable);
        const newRec = curRec - data.amount;

        await tx.customer.update({
          where: { id: customer.id },
          data: { currentReceivable: new Prisma.Decimal(newRec) },
        });

        await tx.customerLedger.create({
          data: {
            customerId: customer.id,
            date: new Date(),
            transactionType: TransactionType.CUSTOMER_PAYMENT,
            referenceId: receiptNumber,
            description: `Payment Receipt #${receiptNumber}${data.notes ? ` - ${data.notes}` : ''}`,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(data.amount),
            runningBalance: new Prisma.Decimal(newRec),
          },
        });

        const payment = await tx.payment.create({
          data: {
            receiptNumber,
            customerId: customer.id,
            amount: new Prisma.Decimal(data.amount),
            paymentMethod: data.paymentMethod,
            reference: data.reference,
            notes: data.notes,
            recordedById: userId,
          },
        });

        return { payment, remainingBalance: newRec, targetName: customer.shopName };
      }

      // 2. Supplier Payment (Disbursement)
      if (data.supplierId) {
        const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
        if (!supplier) throw new Error('Supplier not found');

        const curPay = Number(supplier.currentPayable);
        const newPay = curPay - data.amount;

        await tx.supplier.update({
          where: { id: supplier.id },
          data: { currentPayable: new Prisma.Decimal(newPay) },
        });

        await tx.supplierLedger.create({
          data: {
            supplierId: supplier.id,
            date: new Date(),
            transactionType: TransactionType.SUPPLIER_PAYMENT,
            referenceId: receiptNumber,
            description: `Payment to Supplier #${receiptNumber}${data.notes ? ` - ${data.notes}` : ''}`,
            debit: new Prisma.Decimal(data.amount),
            credit: new Prisma.Decimal(0),
            runningBalance: new Prisma.Decimal(newPay),
          },
        });

        const payment = await tx.payment.create({
          data: {
            receiptNumber,
            supplierId: supplier.id,
            amount: new Prisma.Decimal(data.amount),
            paymentMethod: data.paymentMethod,
            reference: data.reference,
            notes: data.notes,
            recordedById: userId,
          },
        });

        return { payment, remainingBalance: newPay, targetName: supplier.companyName };
      }
    });

    await logAudit({
      userId,
      action: 'PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: result?.payment.id,
      details: {
        receiptNumber,
        amount: data.amount,
        target: result?.targetName,
      },
      ipAddress: req.ip,
    });

    clearDashboardCache();
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Payment processing failed' });
  }
};

export const deleteLedgerEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type = 'CUSTOMERS' } = req.query;
    const userId = req.user!.id;

    if (type === 'CUSTOMERS') {
      const entry = await prisma.customerLedger.findUnique({
        where: { id },
        include: { customer: true },
      });

      if (!entry) {
        res.status(404).json({ success: false, message: 'Ledger payment record not found.' });
        return;
      }

      // Revert customer balance: if it was a payment/credit, deleting it increases receivable back
      const creditAmt = Number(entry.credit || 0);
      const debitAmt = Number(entry.debit || 0);
      const currentRec = Number(entry.customer.currentReceivable || 0);
      const revertedRec = currentRec + creditAmt - debitAmt;

      await prisma.$transaction(async (tx) => {
        await tx.customer.update({
          where: { id: entry.customerId },
          data: { currentReceivable: new Prisma.Decimal(revertedRec) },
        });

        if (entry.referenceId) {
          await tx.payment.deleteMany({
            where: { receiptNumber: entry.referenceId },
          });
        }

        await tx.customerLedger.delete({
          where: { id },
        });
      });

      await logAudit({
        userId,
        action: 'LEDGER_PAYMENT_DELETED',
        entityType: 'CUSTOMER_LEDGER',
        entityId: id,
        details: {
          customerName: entry.customer.shopName,
          amountReverted: creditAmt > 0 ? creditAmt : debitAmt,
          previousReceivable: currentRec,
          newReceivable: revertedRec,
        },
        ipAddress: req.ip,
      });

      clearDashboardCache();
      res.json({
        success: true,
        message: `Customer payment record deleted successfully. Current balance updated to Rs. ${revertedRec.toLocaleString()}.`,
      });
      return;
    } else {
      // SUPPLIERS
      const entry = await prisma.supplierLedger.findUnique({
        where: { id },
        include: { supplier: true },
      });

      if (!entry) {
        res.status(404).json({ success: false, message: 'Supplier ledger payment record not found.' });
        return;
      }

      const debitAmt = Number(entry.debit || 0);
      const creditAmt = Number(entry.credit || 0);
      const currentPay = Number(entry.supplier.currentPayable || 0);
      const revertedPay = currentPay + debitAmt - creditAmt;

      await prisma.$transaction(async (tx) => {
        await tx.supplier.update({
          where: { id: entry.supplierId },
          data: { currentPayable: new Prisma.Decimal(revertedPay) },
        });

        if (entry.referenceId) {
          await tx.payment.deleteMany({
            where: { receiptNumber: entry.referenceId },
          });
        }

        await tx.supplierLedger.delete({
          where: { id },
        });
      });

      await logAudit({
        userId,
        action: 'SUPPLIER_PAYMENT_DELETED',
        entityType: 'SUPPLIER_LEDGER',
        entityId: id,
        details: {
          supplierName: entry.supplier.companyName,
          amountReverted: debitAmt > 0 ? debitAmt : creditAmt,
          previousPayable: currentPay,
          newPayable: revertedPay,
        },
        ipAddress: req.ip,
      });

      clearDashboardCache();
      res.json({
        success: true,
        message: `Supplier payment record deleted successfully. Current balance updated to Rs. ${revertedPay.toLocaleString()}.`,
      });
      return;
    }
  } catch (error: any) {
    console.error('deleteLedgerEntry error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete ledger entry.' });
  }
};
