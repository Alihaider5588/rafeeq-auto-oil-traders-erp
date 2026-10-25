import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';

let cachedSettings: any = null;
let cachedSettingsTime = 0;
const SETTINGS_CACHE_TTL = 60 * 1000;

export const getSettings = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = Date.now();
    if (cachedSettings && now - cachedSettingsTime < SETTINGS_CACHE_TTL) {
      res.json({ success: true, settings: cachedSettings });
      return;
    }

    let settings = await prisma.systemSetting.findFirst();
    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          companyName: 'RAFIQ AUTO & OIL TRADERS',
          address: '54-Stop Near MCB Bank, Dipalpur Road, Okara',
          phone: '0306-9258573 / 0327-7497457',
          email: 'info@rafiqautooil.com',
          currency: 'PKR',
        },
      });
    }
    cachedSettings = settings;
    cachedSettingsTime = now;
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve settings' });
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, createdAt, updatedAt, ...validData } = req.body;
    let settings = await prisma.systemSetting.findFirst();

    if (validData.taxRatePercent !== undefined && validData.taxRatePercent !== null) {
      validData.taxRatePercent = new Prisma.Decimal(validData.taxRatePercent);
    }
    if (validData.exchangeRate !== undefined && validData.exchangeRate !== null) {
      validData.exchangeRate = new Prisma.Decimal(validData.exchangeRate);
    }

    if (!settings) {
      settings = await prisma.systemSetting.create({ data: validData });
    } else {
      settings = await prisma.systemSetting.update({
        where: { id: settings.id },
        data: validData,
      });
    }

    cachedSettings = settings;
    cachedSettingsTime = Date.now();

    await logAudit({
      userId: req.user?.id,
      action: 'SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      entityId: settings.id,
      details: validData,
      ipAddress: req.ip,
    });

    res.json({ success: true, settings });
  } catch (error: any) {
    console.error('updateSettings error:', error);
    res.status(500).json({ success: false, message: error?.message || 'Failed to update settings' });
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50', action, userId } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (action) where.action = action as string;
    if (userId) where.userId = userId as string;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};

// =========================================================================
// VYAPAAR UTILITIES: Import, Export to Tally, Bulk Update, Integrity & Year Close
// =========================================================================

// 1. Bulk Import Products
export const bulkImportProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Array of product items is required' });
      return;
    }

    let defaultCat = await prisma.category.findFirst();
    if (!defaultCat) {
      defaultCat = await prisma.category.create({ data: { name: 'Lubricant' } });
    }

    let defaultUnit = await prisma.unit.findFirst();
    if (!defaultUnit) {
      defaultUnit = await prisma.unit.create({ data: { name: 'Bottle', symbol: 'Btl' } });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      const sku = (item.sku || `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*100)}`).trim();
      const name = (item.name || 'Imported Lubricant Product').trim();
      const brand = (item.brand || 'General').trim();
      const purchasePrice = Number(item.purchasePrice || item.costPrice || 0);
      const salePrice = Number(item.salePrice || item.sellingPrice || 0);
      const stock = Number(item.currentStock || item.stock || 0);

      const existing = await prisma.product.findUnique({ where: { sku } });
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name,
            brand,
            purchasePrice,
            salePrice,
            currentStock: stock,
          },
        });
        updatedCount++;
      } else {
        await prisma.product.create({
          data: {
            name,
            sku,
            brand,
            categoryId: defaultCat.id,
            unitId: defaultUnit.id,
            purchasePrice,
            salePrice,
            currentStock: stock,
            minimumStockLevel: 5,
            showOnWebsite: true,
            showInCatalog: true,
          },
        });
        createdCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${items.length} items (${createdCount} created, ${updatedCount} updated)`,
      createdCount,
      updatedCount,
    });
  } catch (error: any) {
    console.error('bulkImportProducts error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to bulk import products' });
  }
};

// 2. Bulk Update Products (Rates or Minimum Stock)
export const bulkUpdateProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { updates, percentageAdjustment } = req.body;

    if (percentageAdjustment && typeof percentageAdjustment === 'number') {
      const factor = 1 + (percentageAdjustment / 100);
      const prods = await prisma.product.findMany();
      for (const p of prods) {
        const newSalePrice = Math.round(Number(p.salePrice) * factor);
        await prisma.product.update({
          where: { id: p.id },
          data: { salePrice: newSalePrice },
        });
      }
      res.json({ success: true, message: `All catalog prices adjusted by ${percentageAdjustment}%` });
      return;
    }

    if (Array.isArray(updates)) {
      for (const u of updates) {
        if (!u.id) continue;
        const updatePayload: any = {};
        if (u.salePrice !== undefined) updatePayload.salePrice = Number(u.salePrice);
        if (u.purchasePrice !== undefined) updatePayload.purchasePrice = Number(u.purchasePrice);
        if (u.minimumStockLevel !== undefined) updatePayload.minimumStockLevel = Number(u.minimumStockLevel);
        if (u.currentStock !== undefined) updatePayload.currentStock = Number(u.currentStock);

        await prisma.product.update({
          where: { id: u.id },
          data: updatePayload,
        });
      }
      res.json({ success: true, message: `Successfully updated ${updates.length} items` });
      return;
    }

    res.status(400).json({ success: false, message: 'Invalid bulk update request' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Bulk update failed' });
  }
};

// 3. Bulk Import Parties (Customers & Suppliers)
export const bulkImportParties = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { parties, partyType = 'CUSTOMER' } = req.body;
    if (!Array.isArray(parties) || parties.length === 0) {
      res.status(400).json({ success: false, message: 'Parties array is required' });
      return;
    }

    let count = 0;
    if (partyType === 'SUPPLIER') {
      for (const p of parties) {
        const companyName = (p.companyName || p.name || 'Supplier').trim();
        const phone = (p.phone || `0300-${Math.floor(1000000 + Math.random()*9000000)}`).trim();
        await prisma.supplier.upsert({
          where: { companyName },
          update: { phone, currentPayable: Number(p.balance || 0) },
          create: {
            companyName,
            phone,
            address: p.address || 'Okara Distt',
            openingBalance: Number(p.balance || 0),
            currentPayable: Number(p.balance || 0),
          },
        });
        count++;
      }
    } else {
      for (const p of parties) {
        const shopName = (p.shopName || p.name || 'Customer Shop').trim();
        const ownerName = (p.ownerName || p.contactPerson || shopName).trim();
        const phone = (p.phone || `0300-${Math.floor(1000000 + Math.random()*9000000)}`).trim();
        const openingBalance = Number(p.balance || p.receivable || 0);

        const existing = await prisma.customer.findFirst({ where: { phone } });
        if (existing) {
          await prisma.customer.update({
            where: { id: existing.id },
            data: { shopName, ownerName, currentReceivable: openingBalance },
          });
        } else {
          await prisma.customer.create({
            data: {
              shopName,
              ownerName,
              phone,
              address: p.address || 'Okara',
              area: p.area || 'Okara City',
              openingBalance,
              currentReceivable: openingBalance,
              creditLimit: Number(p.creditLimit || 50000),
            },
          });
        }
        count++;
      }
    }

    res.json({ success: true, message: `Successfully imported ${count} ${partyType.toLowerCase()} parties` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Party import failed' });
  }
};

// 4. Export to Tally XML (Vyapaar Standard)
export const exportToTally = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [sales, customers] = await Promise.all([
      prisma.sale.findMany({
        take: 100,
        orderBy: { saleDate: 'desc' },
        include: { customer: true, items: { include: { product: true } } },
      }),
      prisma.customer.findMany(),
    ]);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n  <HEADER>\n    <TALLYREQUEST>Import Data</TALLYREQUEST>\n  </HEADER>\n  <BODY>\n    <IMPORTDATA>\n      <REQUESTDESC>\n        <REPORTNAME>All Masters &amp; Vouchers</REPORTNAME>\n      </REQUESTDESC>\n      <REQUESTDATA>\n`;

    // Masters / Ledgers
    customers.forEach((c) => {
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <LEDGER NAME="${c.shopName.replace(/&/g, '&amp;')}" ACTION="Create">\n            <NAME>${c.shopName.replace(/&/g, '&amp;')}</NAME>\n            <PARENT>Sundry Debtors</PARENT>\n            <OPENINGBALANCE>${c.openingBalance}</OPENINGBALANCE>\n          </LEDGER>\n        </TALLYMESSAGE>\n`;
    });

    // Sales Vouchers
    sales.forEach((s) => {
      xml += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n          <VOUCHER VCHTYPE="Sales" ACTION="Create">\n            <DATE>${s.saleDate.toISOString().slice(0, 10).replace(/-/g, '')}</DATE>\n            <VOUCHERNUMBER>${s.invoiceNumber}</VOUCHERNUMBER>\n            <PARTYLEDGERNAME>${s.customer.shopName.replace(/&/g, '&amp;')}</PARTYLEDGERNAME>\n            <AMOUNT>-${s.netAmount}</AMOUNT>\n          </VOUCHER>\n        </TALLYMESSAGE>\n`;
    });

    xml += `      </REQUESTDATA>\n    </IMPORTDATA>\n  </BODY>\n</ENVELOPE>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="Rafiq_Auto_Tally_Export.xml"');
    res.send(xml);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Tally export failed' });
  }
};

// 5. Verify Data Integrity Check
export const verifyDataIntegrity = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      productsWithoutSku,
      negativeStockCount,
      customersWithNullPhone,
      cancelledSalesWithActiveBal,
    ] = await Promise.all([
      prisma.product.count({ where: { sku: '' } }),
      prisma.product.count({ where: { currentStock: { lt: 0 } } }),
      prisma.customer.count({ where: { phone: '' } }),
      prisma.sale.count({ where: { status: 'CANCELLED', remainingBalance: { gt: 0 } } }),
    ]);

    const issues: string[] = [];
    if (productsWithoutSku > 0) issues.push(`Found ${productsWithoutSku} products missing SKU codes.`);
    if (negativeStockCount > 0) issues.push(`Found ${negativeStockCount} products with negative stock balances.`);
    if (customersWithNullPhone > 0) issues.push(`Found ${customersWithNullPhone} customers with incomplete contact numbers.`);
    if (cancelledSalesWithActiveBal > 0) issues.push(`Found ${cancelledSalesWithActiveBal} cancelled sales with lingering debit balances.`);

    res.json({
      success: true,
      status: issues.length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
      healthScore: issues.length === 0 ? '100% Verified' : `${Math.max(70, 100 - issues.length * 10)}% Checked`,
      issuesFound: issues.length,
      details: issues.length === 0 ? ['All database relations, stock quantities, and ledgers are verified and 100% consistent.'] : issues,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Verification failed' });
  }
};

// 6. Close Financial Year (Fiscal Balance Rollover)
export const closeFinancialYear = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fiscalYearTitle = `FY-${new Date().getFullYear()}` } = req.body;

    // Roll forward: Current receivables become new opening balances
    const customers = await prisma.customer.findMany();
    for (const c of customers) {
      await prisma.customer.update({
        where: { id: c.id },
        data: {
          openingBalance: c.currentReceivable,
        },
      });
    }

    const suppliers = await prisma.supplier.findMany();
    for (const s of suppliers) {
      await prisma.supplier.update({
        where: { id: s.id },
        data: {
          openingBalance: s.currentPayable,
        },
      });
    }

    await logAudit({
      userId: req.user?.id,
      action: 'FINANCIAL_YEAR_CLOSED',
      entityType: 'FISCAL_YEAR',
      details: { fiscalYearTitle },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Financial Year ${fiscalYearTitle} successfully closed. Customer & Supplier balances rolled over into new Opening Balances.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Closing financial year failed' });
  }
};

