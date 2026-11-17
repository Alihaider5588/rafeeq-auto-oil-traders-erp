import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { PaymentMethod, TransactionType, Role } from '../types/enums';
import { Prisma } from '@prisma/client';
import { clearDashboardCache } from './reportController';

/**
 * Safely parses any date input as Pakistan Standard Time (PKT, UTC+5).
 * Prevents UTC server offsets from skewing dates by +5 or -5 hours.
 */
export function parsePakistanDate(dateInput: string | Date | undefined | null): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  let str = String(dateInput).trim();
  // If it's a datetime-local without timezone (e.g. "2026-11-16T20:32" or "2026-11-16 20:32")
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(str)) {
    str = str.replace(' ', 'T');
    if (str.length === 16) str += ':00';
    str += '+05:00';
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

const paymentSchema = z.object({
  customerId: z.string().min(1).optional().nullable(),
  supplierId: z.string().min(1).optional().nullable(),
  direction: z.enum(['IN', 'OUT']).default('IN').optional(),
  channel: z.enum(['SHOP', 'COUNTER', 'VAN']).default('COUNTER').optional(),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().optional(),
  invoiceNumber: z.string().optional().nullable(),
  notes: z.string().min(1, 'Reason / Narration (Wajah) likhna lazmi hai'),
  date: z.string().optional().nullable(),
  partnerName: z.string().optional().nullable(),
  isDualPartner: z.boolean().optional(),
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

    res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=45');
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

    res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=45');
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

    if (data.supplierId && req.user?.role !== Role.ADMIN && req.user?.role !== Role.OPERATOR) {
      res.status(403).json({ success: false, message: 'Forbidden: Only Administrators or Operators can record supplier disbursements' });
      return;
    }

    const receiptNumber = `PAY-${Date.now().toString().slice(-8)}`;
    const paymentDate = parsePakistanDate(data.date);

    const result = await prisma.$transaction(async (tx) => {
      const isCashOut = data.direction === 'OUT';
      const isVan = data.channel === 'VAN';
      const channelTag = isVan ? ' [🚐 وین وصولی / Van Collection]' : '';

      // 1. Customer Payment (Collection IN or Refund OUT)
      if (data.customerId) {
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (!customer) throw new Error('Customer not found');

        const isWalkIn = customer.phone === '00000000000' || customer.shopName.toLowerCase().includes('walk-in');
        const curRec = isWalkIn ? 0 : Number(customer.currentReceivable);
        // Cash In reduces receivable; Cash Out increases receivable
        const newRec = isWalkIn ? 0 : (isCashOut ? curRec + data.amount : curRec - data.amount);

        await tx.customer.update({
          where: { id: customer.id },
          data: { currentReceivable: new Prisma.Decimal(newRec) },
        });

        const effectiveRef = (data.invoiceNumber ? `INV:${data.invoiceNumber}` : '') +
          (data.reference ? (data.invoiceNumber ? ` | ${data.reference}` : data.reference) : '');

        await tx.customerLedger.create({
          data: {
            customerId: customer.id,
            date: paymentDate,
            transactionType: isCashOut ? TransactionType.ADJUSTMENT : TransactionType.CUSTOMER_PAYMENT,
            referenceId: data.invoiceNumber || receiptNumber,
            description: `${isCashOut ? 'Cash Out / Adaiyigi / Refund' : 'Cash In / Wasooli'} #${receiptNumber}${channelTag}${data.invoiceNumber ? ` [Invoice #${data.invoiceNumber}]` : ''} - ${data.notes}`,
            debit: new Prisma.Decimal(isCashOut ? data.amount : 0),
            credit: new Prisma.Decimal(isCashOut ? 0 : data.amount),
            runningBalance: new Prisma.Decimal(newRec),
          },
        });

        const payment = await tx.payment.create({
          data: {
            receiptNumber,
            customerId: customer.id,
            amount: new Prisma.Decimal(data.amount),
            paymentMethod: data.paymentMethod,
            paymentDate,
            reference: effectiveRef || data.reference,
            notes: `${isCashOut ? '[CASH_OUT] ' : '[CASH_IN] '}${isVan ? '[VAN] ' : ''}${data.invoiceNumber ? `[INV:${data.invoiceNumber}] ` : ''}${data.notes}`,
            recordedById: userId,
          },
        });

        const voucherType = isCashOut ? 'CUSTOMER_REFUND' : 'CUSTOMER_PAYMENT';
        const receipt = {
          receiptNumber,
          invoiceNumber: data.invoiceNumber || receiptNumber,
          voucherType,
          partyType: data.isDualPartner ? 'DUAL_PARTNER' : 'CUSTOMER',
          isDualPartner: Boolean(data.isDualPartner),
          partnerName: data.partnerName || null,
          channel: isVan ? 'VAN' : 'SHOP',
          channelLabel: isVan ? '🚐 وین سپلائی وصولی (Van Collection)' : '🏪 دکان کاؤنٹر (Shop Counter)',
          partyName: customer.shopName,
          contactPerson: customer.ownerName,
          phone: customer.phone,
          address: customer.address,
          previousBalance: curRec,
          paidAmount: data.amount,
          remainingBalance: newRec,
          direction: isCashOut ? 'OUT' : 'IN',
          paymentMethod: data.paymentMethod,
          reference: effectiveRef || data.reference || '',
          notes: data.notes,
          paymentDate: paymentDate.toISOString(),
          recordedByName: req.user?.fullName || 'Cashier / Admin',
        };

        return { 
          payment, 
          remainingBalance: newRec, 
          targetName: customer.shopName, 
          direction: isCashOut ? 'OUT' : 'IN',
          receipt,
        };
      }

      // 2. Supplier Payment (Disbursement OUT or Refund IN)
      if (data.supplierId) {
        const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
        if (!supplier) throw new Error('Supplier not found');

        const curPay = Number(supplier.currentPayable);
        // Cash Out reduces payable; Cash In increases payable (refund from supplier)
        const isSupplierCashIn = data.direction === 'IN';
        const newPay = isSupplierCashIn ? curPay + data.amount : curPay - data.amount;

        await tx.supplier.update({
          where: { id: supplier.id },
          data: { currentPayable: new Prisma.Decimal(newPay) },
        });

        const effectiveRef = (data.invoiceNumber ? `BILL:${data.invoiceNumber}` : '') +
          (data.reference ? (data.invoiceNumber ? ` | ${data.reference}` : data.reference) : '');

        await tx.supplierLedger.create({
          data: {
            supplierId: supplier.id,
            date: paymentDate,
            transactionType: isSupplierCashIn ? TransactionType.ADJUSTMENT : TransactionType.SUPPLIER_PAYMENT,
            referenceId: data.invoiceNumber || receiptNumber,
            description: `${isSupplierCashIn ? 'Cash In / Refund from Supplier' : 'Cash Out / Payment to Supplier'} #${receiptNumber}${channelTag}${data.invoiceNumber ? ` [Bill #${data.invoiceNumber}]` : ''} - ${data.notes}`,
            debit: new Prisma.Decimal(isSupplierCashIn ? 0 : data.amount),
            credit: new Prisma.Decimal(isSupplierCashIn ? data.amount : 0),
            runningBalance: new Prisma.Decimal(newPay),
          },
        });

        const payment = await tx.payment.create({
          data: {
            receiptNumber,
            supplierId: supplier.id,
            amount: new Prisma.Decimal(data.amount),
            paymentMethod: data.paymentMethod,
            paymentDate,
            reference: effectiveRef || data.reference,
            notes: `${isSupplierCashIn ? '[CASH_IN] ' : '[CASH_OUT] '}${isVan ? '[VAN] ' : ''}${data.invoiceNumber ? `[BILL:${data.invoiceNumber}] ` : ''}${data.notes}`,
            recordedById: userId,
          },
        });

        const voucherType = isSupplierCashIn ? 'SUPPLIER_REFUND' : 'SUPPLIER_PAYMENT';
        const receipt = {
          receiptNumber,
          invoiceNumber: data.invoiceNumber || receiptNumber,
          voucherType,
          partyType: data.isDualPartner ? 'DUAL_PARTNER' : 'SUPPLIER',
          isDualPartner: Boolean(data.isDualPartner),
          partnerName: data.partnerName || null,
          channel: isVan ? 'VAN' : 'SHOP',
          channelLabel: isVan ? '🚐 وین سپلائی وصولی (Van Collection)' : '🏪 دکان کاؤنٹر (Shop Counter)',
          partyName: supplier.companyName,
          contactPerson: supplier.contactPerson,
          phone: supplier.phone,
          address: supplier.address,
          previousBalance: curPay,
          paidAmount: data.amount,
          remainingBalance: newPay,
          direction: isSupplierCashIn ? 'IN' : 'OUT',
          paymentMethod: data.paymentMethod,
          reference: effectiveRef || data.reference || '',
          notes: data.notes,
          paymentDate: paymentDate.toISOString(),
          recordedByName: req.user?.fullName || 'Cashier / Admin',
        };

        return { 
          payment, 
          remainingBalance: newPay, 
          targetName: supplier.companyName, 
          direction: isSupplierCashIn ? 'IN' : 'OUT',
          receipt,
        };
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

// ============================================================================
// DUAL PARTNER (MUTUAL / CONTRA) LEDGER & OFFSET SETTLEMENTS
// ============================================================================

export const getDualPartnerLedger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let customer = await prisma.customer.findUnique({
      where: { id },
      include: { salesman: true },
    });

    let supplierId = '';
    if (customer) {
      const match = customer.notes?.match(/\[DUAL_PARTNER:([a-zA-Z0-9_-]+)\]/);
      supplierId = match ? match[1] : '';
    } else {
      const supplier = await prisma.supplier.findUnique({ where: { id } });
      if (supplier) {
        supplierId = supplier.id;
        const match = supplier.notes?.match(/\[DUAL_PARTNER:([a-zA-Z0-9_-]+)\]/);
        const custId = match ? match[1] : '';
        if (custId) {
          customer = await prisma.customer.findUnique({
            where: { id: custId },
            include: { salesman: true },
          });
        }
      }
    }

    if (!customer || !supplierId) {
      res.status(404).json({ success: false, message: 'Dual partner relationship not found for this entity' });
      return;
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      res.status(404).json({ success: false, message: 'Linked supplier record not found' });
      return;
    }

    const [customerEntries, supplierEntries] = await Promise.all([
      prisma.customerLedger.findMany({
        where: { customerId: customer.id },
        orderBy: { date: 'asc' },
      }),
      prisma.supplierLedger.findMany({
        where: { supplierId: supplier.id },
        orderBy: { date: 'asc' },
      }),
    ]);

    let totalSales = 0;
    let totalCustomerReceived = 0;
    customerEntries.forEach((e) => {
      totalSales += Number(e.debit);
      totalCustomerReceived += Number(e.credit);
    });

    let totalPurchases = 0;
    let totalSupplierPaid = 0;
    supplierEntries.forEach((e) => {
      totalPurchases += Number(e.credit);
      totalSupplierPaid += Number(e.debit);
    });

    const currentReceivable = Number(customer.currentReceivable);
    const currentPayable = Number(supplier.currentPayable);
    const netMutualBalance = currentReceivable - currentPayable;

    // Timeline merge
    const timeline = [
      ...customerEntries.map((e) => ({
        id: e.id,
        date: e.date,
        type: e.transactionType,
        source: 'CUSTOMER_ACCOUNT',
        sourceLabel: 'فروخت / کسٹمر کھاتہ (Sale / Receivable)',
        description: e.description,
        referenceId: e.referenceId,
        debit: Number(e.debit),
        credit: Number(e.credit),
        runningBalance: Number(e.runningBalance),
      })),
      ...supplierEntries.map((e) => ({
        id: e.id,
        date: e.date,
        type: e.transactionType,
        source: 'SUPPLIER_ACCOUNT',
        sourceLabel: 'خریداری / سپلائر کھاتہ (Purchase / Payable)',
        description: e.description,
        referenceId: e.referenceId,
        debit: Number(e.debit),
        credit: Number(e.credit),
        runningBalance: Number(e.runningBalance),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      partner: {
        customerId: customer.id,
        supplierId: supplier.id,
        name: customer.shopName,
        ownerName: customer.ownerName,
        phone: customer.phone,
        address: customer.address,
        area: customer.area,
        salesman: customer.salesman,
      },
      summary: {
        totalSales,
        totalPurchases,
        totalCustomerReceived,
        totalSupplierPaid,
        currentReceivable,
        currentPayable,
        netMutualBalance,
        status: netMutualBalance > 0 ? 'RECEIVABLE' : netMutualBalance < 0 ? 'PAYABLE' : 'CLEARED',
      },
      timeline,
      customerEntries,
      supplierEntries,
    });
  } catch (error: any) {
    console.error('getDualPartnerLedger error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch dual partner ledger' });
  }
};

export const recordContraOffset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, supplierId, amount, notes, date } = req.body;
    const offsetAmount = Number(amount);
    if (!offsetAmount || offsetAmount <= 0) {
      res.status(400).json({ success: false, message: 'Valid positive offset amount is required.' });
      return;
    }

    if (!notes || typeof notes !== 'string' || !notes.trim()) {
      res.status(400).json({ success: false, message: 'Reason / Narration (Wajah) likhna lazmi hai for contra settlement.' });
      return;
    }

    const [customer, supplier] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.supplier.findUnique({ where: { id: supplierId } }),
    ]);

    if (!customer || !supplier) {
      res.status(404).json({ success: false, message: 'Customer or Supplier record not found.' });
      return;
    }

    const curRec = Number(customer.currentReceivable);
    const curPay = Number(supplier.currentPayable);

    const voucherNumber = `CONTRA-${Date.now().toString().slice(-8)}`;
    const offsetDate = date ? new Date(date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const newRec = curRec - offsetAmount;
      const newPay = curPay - offsetAmount;

      // 1. Credit customer ledger
      await tx.customer.update({
        where: { id: customer.id },
        data: { currentReceivable: new Prisma.Decimal(newRec) },
      });

      await tx.customerLedger.create({
        data: {
          customerId: customer.id,
          date: offsetDate,
          transactionType: TransactionType.ADJUSTMENT,
          referenceId: voucherNumber,
          description: `Mutual Contra Settlement #${voucherNumber} (آپسی کٹائی with Supplier: ${supplier.companyName}) - ${notes.trim()}`,
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(offsetAmount),
          runningBalance: new Prisma.Decimal(newRec),
        },
      });

      // 2. Debit supplier ledger
      await tx.supplier.update({
        where: { id: supplier.id },
        data: { currentPayable: new Prisma.Decimal(newPay) },
      });

      await tx.supplierLedger.create({
        data: {
          supplierId: supplier.id,
          date: offsetDate,
          transactionType: TransactionType.ADJUSTMENT,
          referenceId: voucherNumber,
          description: `Mutual Contra Settlement #${voucherNumber} (آپسی کٹائی with Customer: ${customer.shopName}) - ${notes.trim()}`,
          debit: new Prisma.Decimal(offsetAmount),
          credit: new Prisma.Decimal(0),
          runningBalance: new Prisma.Decimal(newPay),
        },
      });

      const contraReceipt = {
        receiptNumber: voucherNumber,
        voucherType: 'CONTRA_VOUCHER',
        partyType: 'DUAL_PARTNER',
        isDualPartner: true,
        partyName: `${customer.shopName} / ${supplier.companyName}`,
        customerName: customer.shopName,
        supplierName: supplier.companyName,
        phone: customer.phone || supplier.phone,
        previousReceivable: curRec,
        previousPayable: curPay,
        previousBalance: curRec - curPay,
        paidAmount: offsetAmount,
        newReceivable: newRec,
        newPayable: newPay,
        remainingBalance: newRec - newPay,
        direction: 'CONTRA',
        paymentMethod: 'CONTRA_ADJUSTMENT',
        reference: voucherNumber,
        notes: notes.trim(),
        paymentDate: offsetDate.toISOString(),
        recordedByName: req.user?.fullName || 'Cashier / Admin',
      };

      return {
        voucherNumber,
        newReceivable: newRec,
        newPayable: newPay,
        netMutualBalance: newRec - newPay,
        receipt: contraReceipt,
      };
    });

    clearDashboardCache();

    await logAudit({
      userId: req.user?.id,
      action: 'CONTRA_SETTLEMENT_RECORDED',
      entityType: 'LEDGER',
      entityId: result.voucherNumber,
      details: {
        customer: customer.shopName,
        supplier: supplier.companyName,
        offsetAmount,
        netRemaining: result.netMutualBalance,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Contra clearance of Rs. ${offsetAmount.toLocaleString()} posted successfully!`,
      ...result,
    });
  } catch (error: any) {
    console.error('recordContraOffset error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to record contra offset' });
  }
};

export const getLedgerEntryDetail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { referenceId, type, id } = req.query;
    const ref = (referenceId as string || '').trim();
    const entryId = (id as string || '').trim();

    // 1. Try finding Sale Invoice
    if (ref || type === 'SALE_INVOICE' || type === 'SALE') {
      const sale = await prisma.sale.findFirst({
        where: {
          OR: [
            ...(ref ? [{ invoiceNumber: ref }, { id: ref }] : []),
            ...(entryId ? [{ id: entryId }] : []),
          ],
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

      if (sale) {
        res.json({
          success: true,
          kind: 'SALE',
          sale,
        });
        return;
      }
    }

    // 2. Try finding Purchase Invoice
    if (ref || type === 'PURCHASE_INVOICE' || type === 'PURCHASE') {
      const purchase = await prisma.purchase.findFirst({
        where: {
          OR: [
            ...(ref ? [{ invoiceNumber: ref }, { id: ref }] : []),
            ...(entryId ? [{ id: entryId }] : []),
          ],
        },
        include: {
          supplier: true,
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

      if (purchase) {
        res.json({
          success: true,
          kind: 'PURCHASE',
          purchase,
        });
        return;
      }
    }

    // 3. Try finding Payment Record
    if (ref || type === 'CUSTOMER_PAYMENT' || type === 'SUPPLIER_PAYMENT' || type === 'PAYMENT') {
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            ...(ref ? [{ receiptNumber: ref }, { id: ref }] : []),
            ...(entryId ? [{ id: entryId }] : []),
          ],
        },
        include: {
          customer: true,
          supplier: true,
        },
      });

      if (payment) {
        let recordedBy = null;
        if (payment.recordedById) {
          recordedBy = await prisma.user.findUnique({
            where: { id: payment.recordedById },
            select: { id: true, fullName: true, username: true },
          });
        }

        const isCustomer = Boolean(payment.customerId);
        const party = isCustomer ? payment.customer : payment.supplier;
        const rawAmt = Number(payment.amount);
        const isCashOut = (payment.notes || '').includes('[CASH_OUT]') || (payment.notes || '').toLowerCase().includes('adaiyigi');

        let previousBalance = 0;
        let remainingBalance = 0;

        if (payment.customerId) {
          const matchingLedger = await prisma.customerLedger.findFirst({
            where: {
              customerId: payment.customerId,
              OR: [
                { referenceId: payment.receiptNumber },
                { description: { contains: payment.receiptNumber } },
                ...(payment.reference ? [{ referenceId: payment.reference }] : []),
                ...(entryId ? [{ id: entryId }] : []),
              ],
            },
            orderBy: { date: 'desc' },
          });

          if (matchingLedger) {
            remainingBalance = Number(matchingLedger.runningBalance);
            previousBalance = isCashOut ? remainingBalance - rawAmt : remainingBalance + rawAmt;
          } else {
            remainingBalance = Number(payment.customer?.currentReceivable || 0);
            previousBalance = isCashOut ? remainingBalance - rawAmt : remainingBalance + rawAmt;
          }
        } else if (payment.supplierId) {
          const matchingSupLedger = await prisma.supplierLedger.findFirst({
            where: {
              supplierId: payment.supplierId,
              OR: [
                { referenceId: payment.receiptNumber },
                { description: { contains: payment.receiptNumber } },
                ...(payment.reference ? [{ referenceId: payment.reference }] : []),
                ...(entryId ? [{ id: entryId }] : []),
              ],
            },
            orderBy: { date: 'desc' },
          });

          if (matchingSupLedger) {
            remainingBalance = Number(matchingSupLedger.runningBalance);
            previousBalance = isCashOut ? remainingBalance + rawAmt : remainingBalance - rawAmt;
          } else {
            remainingBalance = Number(payment.supplier?.currentPayable || 0);
            previousBalance = isCashOut ? remainingBalance + rawAmt : remainingBalance - rawAmt;
          }
        }

        const isVan = (payment.notes || '').includes('[VAN]') || (payment.notes || '').toLowerCase().includes('van') || (payment.notes || '').includes('وین');
        const receipt = {
          receiptNumber: payment.receiptNumber,
          invoiceNumber: payment.reference?.startsWith('INV:') ? payment.reference.split('|')[0].replace('INV:', '').trim() : payment.receiptNumber,
          voucherType: isCustomer ? (isCashOut ? 'CUSTOMER_REFUND' : 'CUSTOMER_PAYMENT') : (isCashOut ? 'SUPPLIER_PAYMENT' : 'SUPPLIER_REFUND'),
          partyType: isCustomer ? 'CUSTOMER' : 'SUPPLIER',
          channel: isVan ? 'VAN' : 'SHOP',
          channelLabel: isVan ? '🚐 وین سپلائی وصولی (Van Collection)' : '🏪 دکان کاؤنٹر (Shop Counter)',
          partyName: isCustomer ? (payment.customer?.shopName || 'Customer') : (payment.supplier?.companyName || 'Supplier'),
          contactPerson: isCustomer ? payment.customer?.ownerName : payment.supplier?.contactPerson,
          phone: party?.phone || '',
          address: party?.address || '',
          previousBalance,
          paidAmount: rawAmt,
          remainingBalance,
          direction: isCashOut ? 'OUT' : 'IN',
          paymentMethod: payment.paymentMethod,
          reference: payment.reference || '',
          notes: (payment.notes || '').replace(/\[(CASH_IN|CASH_OUT)\]\s*/g, '').replace(/\[VAN\]\s*/g, '').replace(/\[INV:[^\]]+\]\s*/g, '').trim(),
          paymentDate: payment.paymentDate,
          recordedByName: recordedBy?.fullName || 'Cashier / Admin',
        };

        res.json({
          success: true,
          kind: 'PAYMENT',
          payment: {
            ...payment,
            recordedBy,
          },
          receipt,
        });
        return;
      }
    }

    // 4. Try finding in CustomerLedger or SupplierLedger directly by ID
    let ledgerEntry: any = null;
    if (entryId) {
      ledgerEntry = await prisma.customerLedger.findUnique({
        where: { id: entryId },
        include: { customer: true },
      });

      if (!ledgerEntry) {
        ledgerEntry = await prisma.supplierLedger.findUnique({
          where: { id: entryId },
          include: { supplier: true },
        });
      }
    }

    if (ledgerEntry) {
      const isCust = 'customerId' in ledgerEntry;
      const amt = Number(ledgerEntry.credit) > 0 ? Number(ledgerEntry.credit) : Number(ledgerEntry.debit);
      const isCashIn = Number(ledgerEntry.credit) > 0;
      const party = isCust ? ledgerEntry.customer : ledgerEntry.supplier;
      const isVan = (ledgerEntry.description || '').includes('[VAN]') || (ledgerEntry.description || '').includes('وین') || (ledgerEntry.description || '').toLowerCase().includes('van');

      const receipt = {
        receiptNumber: ledgerEntry.referenceId || `REC-${ledgerEntry.id.slice(0, 8)}`,
        invoiceNumber: ledgerEntry.referenceId || `REC-${ledgerEntry.id.slice(0, 8)}`,
        voucherType: isCust ? (isCashIn ? 'CUSTOMER_PAYMENT' : 'CUSTOMER_REFUND') : (isCashIn ? 'SUPPLIER_REFUND' : 'SUPPLIER_PAYMENT'),
        partyType: isCust ? 'CUSTOMER' : 'SUPPLIER',
        channel: isVan ? 'VAN' : 'SHOP',
        channelLabel: isVan ? '🚐 وین سپلائی وصولی (Van Collection)' : '🏪 دکان کاؤنٹر (Shop Counter)',
        partyName: isCust ? (party?.shopName || 'Customer') : (party?.companyName || 'Supplier'),
        contactPerson: isCust ? party?.ownerName : party?.contactPerson,
        phone: party?.phone || '',
        address: party?.address || '',
        previousBalance: Number(ledgerEntry.runningBalance) + (isCashIn ? amt : -amt),
        paidAmount: amt,
        remainingBalance: Number(ledgerEntry.runningBalance),
        direction: isCashIn ? 'IN' : 'OUT',
        paymentMethod: 'CASH',
        reference: ledgerEntry.referenceId || '-',
        notes: ledgerEntry.description || '',
        paymentDate: ledgerEntry.date ? ledgerEntry.date.toISOString() : new Date().toISOString(),
        recordedByName: req.user?.fullName || 'Cashier / Admin',
      };

      res.json({
        success: true,
        kind: 'LEDGER_ENTRY',
        ledgerEntry,
        receipt,
      });
      return;
    }

    res.status(404).json({ success: false, message: 'Transaction detail not found' });
  } catch (error) {
    console.error('getLedgerEntryDetail error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve transaction detail' });
  }
};

export const getTodayLedgerSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 1. Calculate Start and End of Today in Pakistan Standard Time (PKT, UTC+5)
    const now = new Date();
    const pktMillis = now.getTime() + (5 * 60 * 60 * 1000);
    const pktDate = new Date(pktMillis);
    const pktYear = pktDate.getUTCFullYear();
    const pktMonth = pktDate.getUTCMonth();
    const pktDay = pktDate.getUTCDate();

    // Start of today in PKT: 00:00:00 PKT
    const startOfToday = new Date(Date.UTC(pktYear, pktMonth, pktDay, 0, 0, 0) - (5 * 60 * 60 * 1000));
    // End of today in PKT: 23:59:59.999 PKT
    const endOfToday = new Date(Date.UTC(pktYear, pktMonth, pktDay, 23, 59, 59, 999) - (5 * 60 * 60 * 1000));

    const [
      todayPayments,
      todayCustLedgers,
      todaySuppLedgers,
      custCreditsAgg,
      custDebitsAdjAgg,
      suppDebitsAgg,
      suppCreditsAdjAgg
    ] = await Promise.all([
      prisma.payment.findMany({
        where: {
          paymentDate: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          customer: { select: { id: true, shopName: true, ownerName: true, phone: true, currentReceivable: true } },
          supplier: { select: { id: true, companyName: true, contactPerson: true, phone: true, currentPayable: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      // All Customer ledger entries today (sales, payments, adjustments)
      prisma.customerLedger.findMany({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
        },
        select: {
          customerId: true,
          debit: true,
          credit: true,
          runningBalance: true,
        },
      }),
      // All Supplier ledger entries today (purchases, payments, adjustments)
      prisma.supplierLedger.findMany({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
        },
        select: {
          supplierId: true,
          debit: true,
          credit: true,
          runningBalance: true,
        },
      }),
      // Customer Ledger Credits today (payments / collections received)
      prisma.customerLedger.aggregate({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
          credit: { gt: 0 },
        },
        _sum: { credit: true },
        _count: { id: true },
      }),
      // Customer Ledger Debits today that are Cash Out / Refund adjustments
      prisma.customerLedger.aggregate({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
          debit: { gt: 0 },
          transactionType: { in: ['ADJUSTMENT', 'CUSTOMER_PAYMENT'] },
          description: { contains: 'Cash Out' },
        },
        _sum: { debit: true },
        _count: { id: true },
      }),
      // Supplier Ledger Debits today (payments disbursed)
      prisma.supplierLedger.aggregate({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
          debit: { gt: 0 },
        },
        _sum: { debit: true },
        _count: { id: true },
      }),
      // Supplier Ledger Credits today that are refund adjustments
      prisma.supplierLedger.aggregate({
        where: {
          date: { gte: startOfToday, lte: endOfToday },
          credit: { gt: 0 },
          description: { contains: 'Cash In' },
        },
        _sum: { credit: true },
        _count: { id: true },
      }),
    ]);

    // Build party activity map for today's filter
    const partyActivityMap: Record<string, { debit: number; credit: number; count: number }> = {};
    const todayActiveCustomerIds = new Set<string>();
    const todayActiveSupplierIds = new Set<string>();

    for (const cl of todayCustLedgers) {
      todayActiveCustomerIds.add(cl.customerId);
      if (!partyActivityMap[cl.customerId]) {
        partyActivityMap[cl.customerId] = { debit: 0, credit: 0, count: 0 };
      }
      partyActivityMap[cl.customerId].debit += Number(cl.debit || 0);
      partyActivityMap[cl.customerId].credit += Number(cl.credit || 0);
      partyActivityMap[cl.customerId].count += 1;
    }

    for (const sl of todaySuppLedgers) {
      todayActiveSupplierIds.add(sl.supplierId);
      if (!partyActivityMap[sl.supplierId]) {
        partyActivityMap[sl.supplierId] = { debit: 0, credit: 0, count: 0 };
      }
      partyActivityMap[sl.supplierId].debit += Number(sl.debit || 0);
      partyActivityMap[sl.supplierId].credit += Number(sl.credit || 0);
      partyActivityMap[sl.supplierId].count += 1;
    }

    let directCashIn = 0;
    let directCashOut = 0;
    let counterCashIn = 0;
    let counterCashOut = 0;
    let vanCashIn = 0;
    let vanCashOut = 0;
    let counterInCount = 0;
    let counterOutCount = 0;
    let vanInCount = 0;
    let vanOutCount = 0;
    let custCollectionsCount = 0;
    let suppDisbursementsCount = 0;

    for (const p of todayPayments) {
      const amt = Number(p.amount);
      const isCust = Boolean(p.customerId);
      const isCashOut = (p.notes || '').includes('[CASH_OUT]') || (p.notes || '').toLowerCase().includes('cash out') || (p.notes || '').toLowerCase().includes('adaiyigi');
      const isCashIn = (p.notes || '').includes('[CASH_IN]') || (p.notes || '').toLowerCase().includes('cash in') || (p.notes || '').toLowerCase().includes('wasooli');
      const isVan = (p.notes || '').includes('[VAN]') || (p.notes || '').toLowerCase().includes('van') || (p.notes || '').includes('وین');

      const isDirectionIn = isCust ? !isCashOut : isCashIn;

      if (isDirectionIn) {
        directCashIn += amt;
        if (isCust) custCollectionsCount++;
        if (isVan) {
          vanCashIn += amt;
          vanInCount++;
        } else {
          counterCashIn += amt;
          counterInCount++;
        }
      } else {
        directCashOut += amt;
        if (p.supplierId) suppDisbursementsCount++;
        if (isVan) {
          vanCashOut += amt;
          vanOutCount++;
        } else {
          counterCashOut += amt;
          counterOutCount++;
        }
      }

      if (p.customerId) todayActiveCustomerIds.add(p.customerId);
      if (p.supplierId) todayActiveSupplierIds.add(p.supplierId);
    }

    const totalReceived = Math.max(
      Number(custCreditsAgg._sum.credit || 0) + Number(suppCreditsAdjAgg._sum.credit || 0),
      directCashIn
    );

    const totalPaid = Math.max(
      Number(suppDebitsAgg._sum.debit || 0) + Number(custDebitsAdjAgg._sum.debit || 0),
      directCashOut
    );

    const allUsers = await prisma.user.findMany({ select: { id: true, fullName: true } });
    const userMap = new Map(allUsers.map((u) => [u.id, u.fullName]));

    res.json({
      success: true,
      data: {
        date: `${pktYear}-${String(pktMonth + 1).padStart(2, '0')}-${String(pktDay).padStart(2, '0')}`,
        totalReceived,
        totalPaid,
        netCashFlow: totalReceived - totalPaid,
        counter: {
          received: counterCashIn,
          paid: counterCashOut,
          net: counterCashIn - counterCashOut,
          receivedCount: counterInCount,
          paidCount: counterOutCount,
        },
        van: {
          received: vanCashIn,
          paid: vanCashOut,
          net: vanCashIn - vanCashOut,
          receivedCount: vanInCount,
          paidCount: vanOutCount,
        },
        customerCollections: Number(custCreditsAgg._sum.credit || 0) || directCashIn,
        supplierDisbursements: Number(suppDebitsAgg._sum.debit || 0) || directCashOut,
        receivedCount: Math.max(Number(custCreditsAgg._count.id || 0) + Number(suppCreditsAdjAgg._count.id || 0), custCollectionsCount),
        paidCount: Math.max(Number(suppDebitsAgg._count.id || 0) + Number(custDebitsAdjAgg._count.id || 0), suppDisbursementsCount),
        todayActiveCustomerIds: Array.from(todayActiveCustomerIds),
        todayActiveSupplierIds: Array.from(todayActiveSupplierIds),
        partyActivityMap,
        recentTransactions: todayPayments.map((p) => {
          const isCust = Boolean(p.customerId);
          const isCashOut = (p.notes || '').includes('[CASH_OUT]') || (p.notes || '').toLowerCase().includes('cash out') || (p.notes || '').toLowerCase().includes('adaiyigi');
          const isCashIn = (p.notes || '').includes('[CASH_IN]') || (p.notes || '').toLowerCase().includes('cash in') || (p.notes || '').toLowerCase().includes('wasooli');
          const dir = isCust ? (isCashOut ? 'OUT' : 'IN') : (isCashIn ? 'IN' : 'OUT');
          const isVan = (p.notes || '').includes('[VAN]') || (p.notes || '').toLowerCase().includes('van') || (p.notes || '').includes('وین');

          // Extract invoice number from reference or notes
          let invNumber = '';
          if (p.reference?.includes('INV:')) {
            invNumber = p.reference.split('INV:')[1]?.split('|')[0]?.trim() || '';
          } else if (p.notes?.includes('[INV:')) {
            invNumber = p.notes.split('[INV:')[1]?.split(']')[0]?.trim() || '';
          }

          const curBal = isCust
            ? Number(p.customer?.currentReceivable || 0)
            : Number(p.supplier?.currentPayable || 0);

          return {
            id: p.id,
            receiptNumber: p.receiptNumber,
            invoiceNumber: invNumber || p.receiptNumber,
            amount: Number(p.amount),
            direction: dir,
            channel: isVan ? 'VAN' : 'SHOP',
            channelLabel: isVan ? '🚐 وین وصولی (Van)' : '🏪 دکان (Shop)',
            customerId: p.customerId,
            supplierId: p.supplierId,
            partyName: p.customer?.shopName || p.supplier?.companyName || 'Cash Account',
            ownerName: p.customer?.ownerName || p.supplier?.contactPerson || '',
            phone: p.customer?.phone || p.supplier?.phone || '',
            partyType: isCust ? 'CUSTOMER' : (p.supplierId ? 'SUPPLIER' : 'GENERAL'),
            paymentMethod: p.paymentMethod,
            paymentDate: p.paymentDate,
            reference: p.reference || '',
            notes: (p.notes || '').replace(/\[(CASH_IN|CASH_OUT)\]\s*/gi, '').replace(/\[VAN\]\s*/gi, '').replace(/\[INV:[^\]]+\]\s*/gi, '').trim(),
            remainingBalance: curBal,
            previousBalance: dir === 'IN' ? curBal + Number(p.amount) : curBal - Number(p.amount),
            recordedByName: userMap.get(p.recordedById) || 'Cashier / Admin',
          };
        }),
      },
    });
  } catch (error: any) {
    console.error('getTodayLedgerSummary error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve today ledger summary' });
  }
};
