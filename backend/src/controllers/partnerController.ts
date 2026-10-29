import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { TransactionType } from '../types/enums';
import { Prisma } from '@prisma/client';

const supplierSchema = z.object({
  companyName: z.string().min(2),
  contactPerson: z.string().optional(),
  phone: z.string().min(6),
  address: z.string().optional(),
  ntnTaxNumber: z.string().optional(),
  openingBalance: z.number().default(0),
  notes: z.string().optional(),
});

const customerSchema = z.object({
  shopName: z.string().min(2),
  ownerName: z.string().min(2),
  phone: z.string().min(6),
  address: z.string().optional(),
  area: z.string().optional(),
  salesmanId: z.string().min(1).optional().nullable(),
  openingBalance: z.number().default(0),
  creditLimit: z.number().default(100000),
  notes: z.string().optional(),
});

// SUPPLIERS
export const getSuppliers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const where: Prisma.SupplierWhereInput = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search as string } },
        { phone: { contains: search as string } },
        { contactPerson: { contains: search as string } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { companyName: 'asc' },
    });

    const enrichedSuppliers = suppliers.map((s) => {
      const match = s.notes ? s.notes.match(/\[DUAL_PARTNER:([a-zA-Z0-9_-]+)\]/) : null;
      return {
        ...s,
        isDualPartner: Boolean(match),
        linkedCustomerId: match ? match[1] : null,
      };
    });

    res.json({ success: true, suppliers: enrichedSuppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve suppliers' });
  }
};

export const getSupplierById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        ledgerEntries: {
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });

    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found' });
      return;
    }

    res.json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get supplier' });
  }
};

export const createSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = supplierSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    const supplier = await prisma.$transaction(async (tx) => {
      const created = await tx.supplier.create({
        data: {
          companyName: data.companyName,
          contactPerson: data.contactPerson,
          phone: data.phone,
          address: data.address,
          ntnTaxNumber: data.ntnTaxNumber,
          openingBalance: new Prisma.Decimal(data.openingBalance),
          currentPayable: new Prisma.Decimal(data.openingBalance),
          notes: data.notes,
        },
      });

      if (data.openingBalance !== 0) {
        await tx.supplierLedger.create({
          data: {
            supplierId: created.id,
            transactionType: TransactionType.OPENING_BALANCE,
            description: 'Opening Balance',
            credit: new Prisma.Decimal(data.openingBalance),
            debit: new Prisma.Decimal(0),
            runningBalance: new Prisma.Decimal(data.openingBalance),
          },
        });
      }

      return created;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'SUPPLIER_CREATED',
      entityType: 'SUPPLIER',
      entityId: supplier.id,
      details: { companyName: supplier.companyName },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, supplier });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create supplier' });
  }
};

let isWalkInCustomerEnsured = false;
let cachedAllCustomers: any = null;
let cachedAllCustomersTime = 0;
const CUSTOMERS_CACHE_TTL = 30 * 1000;

// CUSTOMERS
export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, area, salesmanId } = req.query;

    // Ensure Walk-in Customer exists by default once per server lifecycle
    if (!isWalkInCustomerEnsured) {
      const walkInExists = await prisma.customer.findFirst({
        where: {
          OR: [
            { phone: '00000000000' },
            { shopName: { contains: 'Walk-in' } }
          ]
        }
      });

      if (!walkInExists) {
        await prisma.customer.create({
          data: {
            shopName: 'Walk-in Customer / Counter Sale',
            ownerName: 'Direct Cash Customer',
            phone: '00000000000',
            address: 'Main Shop / Counter',
            area: 'Okara Local',
            openingBalance: new Prisma.Decimal(0),
            currentReceivable: new Prisma.Decimal(0),
            creditLimit: new Prisma.Decimal(0),
            notes: 'Standard Walk-in customer for retail counter billing',
          }
        });
      }
      isWalkInCustomerEnsured = true;
    }

    const where: Prisma.CustomerWhereInput = {};

    if (search) {
      where.OR = [
        { shopName: { contains: search as string } },
        { ownerName: { contains: search as string } },
        { phone: { contains: search as string } },
      ];
    }

    if (area) where.area = area as string;
    if (salesmanId) where.salesmanId = salesmanId as string;

    const isUnfiltered = !search && !area && !salesmanId;
    if (isUnfiltered && cachedAllCustomers && Date.now() - cachedAllCustomersTime < CUSTOMERS_CACHE_TTL) {
      res.json({ success: true, customers: cachedAllCustomers });
      return;
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        salesman: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { shopName: 'asc' },
    });

    const enrichedCustomers = customers.map((c) => {
      const match = c.notes ? c.notes.match(/\[DUAL_PARTNER:([a-zA-Z0-9_-]+)\]/) : null;
      return {
        ...c,
        isDualPartner: Boolean(match),
        linkedSupplierId: match ? match[1] : null,
      };
    });

    if (isUnfiltered) {
      cachedAllCustomers = enrichedCustomers;
      cachedAllCustomersTime = Date.now();
    }

    res.json({ success: true, customers: enrichedCustomers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve customers' });
  }
};

export const getCustomerById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesman: { select: { id: true, fullName: true, username: true } },
        ledgerEntries: {
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve customer' });
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          shopName: data.shopName,
          ownerName: data.ownerName,
          phone: data.phone,
          address: data.address,
          area: data.area,
          salesmanId: data.salesmanId,
          openingBalance: new Prisma.Decimal(data.openingBalance),
          currentReceivable: new Prisma.Decimal(data.openingBalance),
          creditLimit: new Prisma.Decimal(data.creditLimit),
          notes: data.notes,
        },
      });

      if (data.openingBalance !== 0) {
        await tx.customerLedger.create({
          data: {
            customerId: created.id,
            transactionType: TransactionType.OPENING_BALANCE,
            description: 'Opening Balance',
            debit: new Prisma.Decimal(data.openingBalance),
            credit: new Prisma.Decimal(0),
            runningBalance: new Prisma.Decimal(data.openingBalance),
          },
        });
      }

      return created;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      details: { shopName: customer.shopName },
      ipAddress: req.ip,
    });

    cachedAllCustomers = null;
    res.status(201).json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create customer' });
  }
};

// DELETE /api/partners/customers/:id (Permanent Delete)
export const deleteCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, shopName: true },
    });

    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const sales = await prisma.sale.findMany({
      where: { customerId: id },
      select: { id: true, invoiceNumber: true },
    });
    const saleIds = sales.map((s) => s.id);
    const invoiceNumbers = sales.map((s) => s.invoiceNumber);

    await prisma.$transaction(async (tx) => {
      // 1. Delete rate history
      if ((tx as any).customerProductRate) {
        await (tx as any).customerProductRate.deleteMany({ where: { customerId: id } });
      }

      // 2. Delete customer payments & receipts
      await tx.payment.deleteMany({ where: { customerId: id } });
      if (invoiceNumbers.length > 0) {
        await tx.payment.deleteMany({ where: { reference: { in: invoiceNumbers } } });
      }

      // 3. Delete ledgers
      await tx.customerLedger.deleteMany({ where: { customerId: id } });

      // 4. Delete sales returns
      await tx.salesReturnItem.deleteMany({
        where: { salesReturn: { customerId: id } },
      });
      await tx.salesReturn.deleteMany({ where: { customerId: id } });

      // 5. Delete customer sales, stock movements, and items
      if (saleIds.length > 0) {
        await tx.stockMovement.deleteMany({ where: { referenceId: { in: saleIds } } });
        await tx.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
        await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
      }

      // 6. Delete customer record
      await tx.customer.delete({ where: { id } });
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CUSTOMER_DELETED',
      entityType: 'CUSTOMER',
      entityId: id,
      details: { shopName: customer.shopName },
      ipAddress: req.ip,
    });

    cachedAllCustomers = null;

    res.json({
      success: true,
      message: `Customer "${customer.shopName}" was permanently deleted from database and POS.`,
    });
  } catch (error: any) {
    console.error('deleteCustomer error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete customer' });
  }
};

// DELETE /api/partners/suppliers/:id (Permanent Delete)
export const deleteSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, companyName: true },
    });

    if (!supplier) {
      res.status(404).json({ success: false, message: 'Supplier not found' });
      return;
    }

    const purchases = await prisma.purchase.findMany({
      where: { supplierId: id },
      select: { id: true, invoiceNumber: true },
    });
    const purchaseIds = purchases.map((p) => p.id);
    const invoiceNumbers = purchases.map((p) => p.invoiceNumber);

    await prisma.$transaction(async (tx) => {
      // 1. Delete payments
      await tx.payment.deleteMany({ where: { supplierId: id } });
      if (invoiceNumbers.length > 0) {
        await tx.payment.deleteMany({ where: { reference: { in: invoiceNumbers } } });
      }

      // 2. Delete ledgers
      await tx.supplierLedger.deleteMany({ where: { supplierId: id } });

      // 3. Delete returns
      await tx.purchaseReturnItem.deleteMany({
        where: { purchaseReturn: { supplierId: id } },
      });
      await tx.purchaseReturn.deleteMany({ where: { supplierId: id } });

      // 4. Delete purchases, movements, and items
      if (purchaseIds.length > 0) {
        await tx.stockMovement.deleteMany({ where: { referenceId: { in: purchaseIds } } });
        await tx.purchaseItem.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
        await tx.purchase.deleteMany({ where: { id: { in: purchaseIds } } });
      }

      // 5. Delete supplier record
      await tx.supplier.delete({ where: { id } });
    });

    await logAudit({
      userId: req.user?.id,
      action: 'SUPPLIER_DELETED',
      entityType: 'SUPPLIER',
      entityId: id,
      details: { companyName: supplier.companyName },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Supplier "${supplier.companyName}" was permanently deleted from database and POS.`,
    });
  } catch (error: any) {
    console.error('deleteSupplier error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete supplier' });
  }
};

// ============================================================================
// DUAL PARTNERS (Customer + Supplier Both / مشترکہ پارٹنرز)
// ============================================================================

const dualPartnerSchema = z.object({
  name: z.string().min(2, 'Shop or Company name is required'),
  ownerName: z.string().min(2, 'Contact person or owner name is required'),
  phone: z.string().min(6, 'Valid phone number is required'),
  address: z.string().optional(),
  area: z.string().optional(),
  salesmanId: z.string().min(1).optional().nullable(),
  openingReceivable: z.number().default(0),
  openingPayable: z.number().default(0),
  creditLimit: z.number().default(100000),
  notes: z.string().optional(),
});

export const createDualPartner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = dualPartnerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    // Check if customer with same phone already exists
    const existingCust = await prisma.customer.findFirst({ where: { phone: data.phone } });
    if (existingCust) {
      res.status(400).json({
        success: false,
        message: `A customer with phone number ${data.phone} already exists (${existingCust.shopName}). You can link them instead.`,
      });
      return;
    }

    let supplierName = data.name;
    const existingSupp = await prisma.supplier.findUnique({ where: { companyName: supplierName } });
    if (existingSupp) {
      supplierName = `${data.name} (Supplier)`;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Supplier first
      const supplier = await tx.supplier.create({
        data: {
          companyName: supplierName,
          contactPerson: data.ownerName,
          phone: data.phone,
          address: data.address,
          openingBalance: new Prisma.Decimal(data.openingPayable),
          currentPayable: new Prisma.Decimal(data.openingPayable),
          notes: `[DUAL_PARTNER_PENDING] ${data.notes || ''}`.trim(),
        },
      });

      // 2. Create Customer with link to Supplier
      const customer = await tx.customer.create({
        data: {
          shopName: data.name,
          ownerName: data.ownerName,
          phone: data.phone,
          address: data.address,
          area: data.area,
          salesmanId: data.salesmanId,
          openingBalance: new Prisma.Decimal(data.openingReceivable),
          currentReceivable: new Prisma.Decimal(data.openingReceivable),
          creditLimit: new Prisma.Decimal(data.creditLimit),
          notes: `[DUAL_PARTNER:${supplier.id}] ${data.notes || ''}`.trim(),
        },
      });

      // 3. Update Supplier notes with link to Customer
      await tx.supplier.update({
        where: { id: supplier.id },
        data: {
          notes: `[DUAL_PARTNER:${customer.id}] ${data.notes || ''}`.trim(),
        },
      });

      // 4. Create opening ledgers if balance > 0
      if (data.openingReceivable !== 0) {
        await tx.customerLedger.create({
          data: {
            customerId: customer.id,
            transactionType: TransactionType.OPENING_BALANCE,
            description: 'Opening Balance (Receivable / لینا ہے)',
            debit: new Prisma.Decimal(data.openingReceivable),
            credit: new Prisma.Decimal(0),
            runningBalance: new Prisma.Decimal(data.openingReceivable),
          },
        });
      }

      if (data.openingPayable !== 0) {
        await tx.supplierLedger.create({
          data: {
            supplierId: supplier.id,
            transactionType: TransactionType.OPENING_BALANCE,
            description: 'Opening Balance (Payable / دینا ہے)',
            credit: new Prisma.Decimal(data.openingPayable),
            debit: new Prisma.Decimal(0),
            runningBalance: new Prisma.Decimal(data.openingPayable),
          },
        });
      }

      return { customer, supplier };
    });

    cachedAllCustomers = null;

    await logAudit({
      userId: req.user?.id,
      action: 'DUAL_PARTNER_CREATED',
      entityType: 'PARTNER',
      entityId: result.customer.id,
      details: { name: data.name, phone: data.phone, supplierId: result.supplier.id },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Dual Partner "${data.name}" (Customer + Supplier Both) created successfully!`,
      partner: {
        id: result.customer.id,
        customerId: result.customer.id,
        supplierId: result.supplier.id,
        name: data.name,
        ownerName: data.ownerName,
        phone: data.phone,
        currentReceivable: data.openingReceivable,
        currentPayable: data.openingPayable,
        netBalance: data.openingReceivable - data.openingPayable,
      },
    });
  } catch (error: any) {
    console.error('createDualPartner error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create dual partner' });
  }
};

export const getDualPartners = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query;

    const customers = await prisma.customer.findMany({
      where: {
        notes: { contains: '[DUAL_PARTNER:' },
        ...(search ? {
          OR: [
            { shopName: { contains: search as string } },
            { ownerName: { contains: search as string } },
            { phone: { contains: search as string } },
          ]
        } : {})
      },
      include: {
        salesman: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { shopName: 'asc' },
    });

    const supplierIds = customers
      .map((c) => {
        const match = c.notes?.match(/\[DUAL_PARTNER:([a-zA-Z0-9_-]+)\]/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
    });

    const supplierMap = new Map(suppliers.map((s) => [s.id, s]));

    const dualPartners = customers.map((c) => {
      const match = c.notes?.match(/\[DUAL_PARTNER:([a-zA-Z0-9_-]+)\]/);
      const supplierId = match ? match[1] : '';
      const supplier = supplierMap.get(supplierId);

      const receivable = Number(c.currentReceivable || 0);
      const payable = Number(supplier?.currentPayable || 0);
      const netBalance = receivable - payable;

      return {
        id: c.id,
        customerId: c.id,
        supplierId,
        name: c.shopName,
        ownerName: c.ownerName,
        phone: c.phone,
        address: c.address,
        area: c.area,
        salesman: c.salesman,
        currentReceivable: receivable,
        currentPayable: payable,
        netBalance,
        status: netBalance > 0 ? 'RECEIVABLE' : netBalance < 0 ? 'PAYABLE' : 'CLEARED',
        notes: c.notes?.replace(/\[DUAL_PARTNER:[^\]]+\]/, '').trim(),
      };
    });

    res.json({ success: true, dualPartners });
  } catch (error: any) {
    console.error('getDualPartners error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve dual partners' });
  }
};

export const linkExistingPartners = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, supplierId } = req.body;
    if (!customerId || !supplierId) {
      res.status(400).json({ success: false, message: 'customerId and supplierId are required' });
      return;
    }

    const [customer, supplier] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.supplier.findUnique({ where: { id: supplierId } }),
    ]);

    if (!customer || !supplier) {
      res.status(404).json({ success: false, message: 'Customer or Supplier not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const cleanCustNotes = (customer.notes || '').replace(/\[DUAL_PARTNER:[^\]]+\]/g, '').trim();
      const cleanSuppNotes = (supplier.notes || '').replace(/\[DUAL_PARTNER:[^\]]+\]/g, '').trim();

      await tx.customer.update({
        where: { id: customer.id },
        data: { notes: `[DUAL_PARTNER:${supplier.id}] ${cleanCustNotes}`.trim() },
      });

      await tx.supplier.update({
        where: { id: supplier.id },
        data: { notes: `[DUAL_PARTNER:${customer.id}] ${cleanSuppNotes}`.trim() },
      });
    });

    cachedAllCustomers = null;

    res.json({
      success: true,
      message: `Linked "${customer.shopName}" and "${supplier.companyName}" as Dual Partner!`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to link partners' });
  }
};

