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

    res.json({ success: true, suppliers });
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

// CUSTOMERS
export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, area, salesmanId } = req.query;

    // Ensure Walk-in Customer exists by default for direct shop sales
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

    const customers = await prisma.customer.findMany({
      where,
      include: {
        salesman: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { shopName: 'asc' },
    });

    res.json({ success: true, customers });
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

    res.status(201).json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create customer' });
  }
};
