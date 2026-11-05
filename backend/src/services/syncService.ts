import fs from 'fs';
import path from 'path';
import { clearProductsCache } from '../controllers/productController';
import { clearDashboardCache } from '../controllers/reportController';

const SYNC_META_FILE = path.join(__dirname, '..', '..', 'prisma', 'sync_metadata.json');

export interface SyncStatus {
  isLocalMode: boolean;
  neonConfigured: boolean;
  lastSyncTime: string | null;
  lastSyncStatus: string | null;
  pendingLocalCount: number;
}

export function getSyncMetadata(): { lastSyncTime: string | null; lastSyncStatus: string | null } {
  try {
    if (fs.existsSync(SYNC_META_FILE)) {
      const data = JSON.parse(fs.readFileSync(SYNC_META_FILE, 'utf8'));
      return {
        lastSyncTime: data.lastSyncTime || null,
        lastSyncStatus: data.lastSyncStatus || null,
      };
    }
  } catch (err) {
    console.error('Error reading sync_metadata.json:', err);
  }
  return { lastSyncTime: null, lastSyncStatus: null };
}

export function saveSyncMetadata(lastSyncTime: string, lastSyncStatus: string, stats?: any) {
  try {
    const meta = {
      lastSyncTime,
      lastSyncStatus,
      stats,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(SYNC_META_FILE, JSON.stringify(meta, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving sync_metadata.json:', err);
  }
}

function getLocalSqliteClient() {
  const { PrismaClient: SqliteClient } = require('@prisma/client');
  return new SqliteClient();
}

function getNeonPostgresClient() {
  const neonUrl = process.env.NEON_DATABASE_URL;
  if (!neonUrl || neonUrl.trim() === '') {
    throw new Error('NEON_DATABASE_URL is missing or empty in .env configuration');
  }
  let connectionUrl = neonUrl.trim();
  if (connectionUrl.includes('-pooler.') && !connectionUrl.includes('pgbouncer=true')) {
    const sep = connectionUrl.includes('?') ? '&' : '?';
    connectionUrl = `${connectionUrl}${sep}pgbouncer=true&connection_limit=3&connect_timeout=12`;
  }
  const { PrismaClient: PostgresClient } = require('@prisma/client-postgres');
  return new PostgresClient({
    datasources: { db: { url: connectionUrl } },
    log: ['error'],
  });
}

/**
 * Checks pending local records in SQLite created or updated since lastSyncTime.
 */
export async function getPendingLocalCount(lastSyncDate: Date | null): Promise<number> {
  const local = getLocalSqliteClient();
  try {
    const filter = lastSyncDate ? { updatedAt: { gt: lastSyncDate } } : {};
    const createdFilter = lastSyncDate ? { createdAt: { gt: lastSyncDate } } : {};

    const [sales, purchases, ledgers, products, customers] = await Promise.all([
      local.sale.count({ where: createdFilter }),
      local.purchase.count({ where: createdFilter }),
      local.customerLedger.count({ where: createdFilter }),
      local.product.count({ where: filter }),
      local.customer.count({ where: filter }),
    ]);

    return sales + purchases + ledgers + products + customers;
  } catch (err) {
    console.error('Error counting pending local records:', err);
    return 0;
  } finally {
    await local.$disconnect();
  }
}

/**
 * Initial One-Time Seed: Pull all master data from Neon PostgreSQL into local SQLite.
 * Used when setting up shop computer for the first time.
 */
export async function pullAllFromCloud(): Promise<any> {
  const local = getLocalSqliteClient();
  const neon = getNeonPostgresClient();

  const pulledStats: Record<string, number> = {};

  try {
    console.log('[Sync] Initiating full cloud pull from Neon to local SQLite...');
    await neon.$connect();

    // 1. Users
    const users = await neon.user.findMany();
    for (const u of users) {
      await local.user.upsert({ where: { id: u.id }, create: u, update: u });
    }
    pulledStats.users = users.length;

    // 2. Categories
    const categories = await neon.category.findMany();
    for (const c of categories) {
      await local.category.upsert({ where: { id: c.id }, create: c, update: c });
    }
    pulledStats.categories = categories.length;

    // 3. Units
    const units = await neon.unit.findMany();
    for (const un of units) {
      await local.unit.upsert({ where: { id: un.id }, create: un, update: un });
    }
    pulledStats.units = units.length;

    // 4. Suppliers
    const suppliers = await neon.supplier.findMany();
    for (const s of suppliers) {
      await local.supplier.upsert({ where: { id: s.id }, create: s, update: s });
    }
    pulledStats.suppliers = suppliers.length;

    // 5. Customers
    const customers = await neon.customer.findMany();
    for (const cust of customers) {
      await local.customer.upsert({ where: { id: cust.id }, create: cust, update: cust });
    }
    pulledStats.customers = customers.length;

    // 6. Vehicles
    const vehicles = await neon.vehicle.findMany();
    for (const v of vehicles) {
      await local.vehicle.upsert({ where: { id: v.id }, create: v, update: v });
    }
    pulledStats.vehicles = vehicles.length;

    // 7. Products
    const products = await neon.product.findMany();
    for (const p of products) {
      await local.product.upsert({ where: { id: p.id }, create: p, update: p });
    }
    pulledStats.products = products.length;

    // 8. Custom Customer Rates
    const rates = await neon.customerProductRate.findMany();
    for (const r of rates) {
      await local.customerProductRate.upsert({ where: { id: r.id }, create: r, update: r });
    }
    pulledStats.rates = rates.length;

    // 9. System Settings
    const settings = await neon.systemSetting.findMany();
    for (const st of settings) {
      await local.systemSetting.upsert({ where: { id: st.id }, create: st, update: st });
    }
    pulledStats.settings = settings.length;

    // 10. Customer Ledgers (Opening & Running balances)
    const ledgers = await neon.customerLedger.findMany({ take: 500, orderBy: { date: 'desc' } });
    for (const cl of ledgers) {
      await local.customerLedger.upsert({ where: { id: cl.id }, create: cl, update: cl });
    }
    pulledStats.customerLedgers = ledgers.length;

    const syncTime = new Date().toISOString();
    saveSyncMetadata(syncTime, 'SUCCESS', { mode: 'FULL_PULL', stats: pulledStats });

    clearProductsCache();
    clearDashboardCache();

    console.log('[Sync] Full pull completed successfully:', pulledStats);
    return {
      success: true,
      message: 'Full master catalog and records successfully synced from Cloud to Local PC.',
      timestamp: syncTime,
      stats: pulledStats,
    };
  } finally {
    await local.$disconnect();
    await neon.$disconnect();
  }
}

/**
 * Two-Way Incremental Sync:
 * 1. PUSHES local offline transactions (Sales, Purchases, Ledgers, Expenses) to Neon.
 * 2. PULLS any cloud updates (Mobile Admin price updates, new customers, salesman orders) to Local.
 * 3. Immediately disconnects from Neon to preserve 100 compute-hour limit.
 */
export async function runTwoWaySync(): Promise<any> {
  const meta = getSyncMetadata();
  const lastSyncDate = meta.lastSyncTime ? new Date(meta.lastSyncTime) : null;

  // If never synced before, run full initial baseline pull
  if (!lastSyncDate) {
    return await pullAllFromCloud();
  }

  const local = getLocalSqliteClient();
  const neon = getNeonPostgresClient();

  const pushed: Record<string, number> = {
    sales: 0,
    purchases: 0,
    customers: 0,
    ledgers: 0,
    expenses: 0,
    returns: 0,
    payments: 0,
  };
  const pulled: Record<string, number> = {
    products: 0,
    customers: 0,
    salesmanOrders: 0,
  };

  try {
    console.log(`[Sync] Starting two-way incremental sync (Since: ${lastSyncDate.toISOString()})...`);
    await neon.$connect();

    // =========================================================================
    // PART 1: PUSH LOCAL OFFLINE DATA TO NEON CLOUD
    // =========================================================================

    // A. Customers created or updated locally
    const localCustomers = await local.customer.findMany({
      where: { updatedAt: { gte: lastSyncDate } },
    });
    for (const c of localCustomers) {
      await neon.customer.upsert({ where: { id: c.id }, create: c, update: c });
      pushed.customers++;
    }

    // B. Suppliers created or updated locally
    const localSuppliers = await local.supplier.findMany({
      where: { updatedAt: { gte: lastSyncDate } },
    });
    for (const s of localSuppliers) {
      await neon.supplier.upsert({ where: { id: s.id }, create: s, update: s });
    }

    // C. Purchases created locally
    const localPurchases = await local.purchase.findMany({
      where: { createdAt: { gte: lastSyncDate } },
      include: { items: true },
    });
    for (const p of localPurchases) {
      const { items, ...purchaseData } = p;
      await neon.purchase.upsert({
        where: { id: purchaseData.id },
        create: purchaseData,
        update: purchaseData,
      });
      for (const it of items) {
        await neon.purchaseItem.upsert({
          where: { id: it.id },
          create: it,
          update: it,
        });
      }
      pushed.purchases++;
    }

    // D. Sales created or updated locally
    const localSales = await local.sale.findMany({
      where: {
        OR: [
          { createdAt: { gte: lastSyncDate } },
          { updatedAt: { gte: lastSyncDate } },
        ],
      },
      include: { items: true },
    });
    for (const s of localSales) {
      const { items, ...saleData } = s;
      await neon.sale.upsert({
        where: { id: saleData.id },
        create: saleData,
        update: saleData,
      });
      for (const it of items) {
        await neon.saleItem.upsert({
          where: { id: it.id },
          create: it,
          update: it,
        });
      }
      pushed.sales++;
    }

    // E. Customer Ledgers
    const localLedgers = await local.customerLedger.findMany({
      where: { date: { gte: lastSyncDate } },
    });
    for (const cl of localLedgers) {
      await neon.customerLedger.upsert({ where: { id: cl.id }, create: cl, update: cl });
      pushed.ledgers++;
    }

    // F. Supplier Ledgers
    const localSupLedgers = await local.supplierLedger.findMany({
      where: { date: { gte: lastSyncDate } },
    });
    for (const sl of localSupLedgers) {
      await neon.supplierLedger.upsert({ where: { id: sl.id }, create: sl, update: sl });
    }

    // G. Payments
    const localPayments = await local.payment.findMany({
      where: { paymentDate: { gte: lastSyncDate } },
    });
    for (const pay of localPayments) {
      await neon.payment.upsert({ where: { id: pay.id }, create: pay, update: pay });
      pushed.payments++;
    }

    // H. Expenses
    const localExpenses = await local.expense.findMany({
      where: { expenseDate: { gte: lastSyncDate } },
    });
    for (const exp of localExpenses) {
      await neon.expense.upsert({ where: { id: exp.id }, create: exp, update: exp });
      pushed.expenses++;
    }

    // I. Stock Movements
    const localMovements = await local.stockMovement.findMany({
      where: { createdAt: { gte: lastSyncDate } },
    });
    for (const sm of localMovements) {
      await neon.stockMovement.upsert({ where: { id: sm.id }, create: sm, update: sm });
    }

    // J. Update local product stock balances to Neon
    const localProducts = await local.product.findMany({
      where: { updatedAt: { gte: lastSyncDate } },
    });
    for (const lp of localProducts) {
      await neon.product.update({
        where: { id: lp.id },
        data: { currentStock: lp.currentStock, updatedAt: lp.updatedAt },
      });
    }

    // =========================================================================
    // PART 2: PULL CLOUD CHANGES (FROM MOBILE ADMIN / SALESMAN) TO LOCAL PC
    // =========================================================================

    // A. Product price changes or catalog edits done by Admin on mobile
    const cloudProducts = await neon.product.findMany({
      where: { updatedAt: { gt: lastSyncDate } },
    });
    for (const cp of cloudProducts) {
      await local.product.upsert({
        where: { id: cp.id },
        create: cp,
        update: cp,
      });
      pulled.products++;
    }

    // B. Customers added by Admin on mobile
    const cloudCustomers = await neon.customer.findMany({
      where: { createdAt: { gt: lastSyncDate } },
    });
    for (const cc of cloudCustomers) {
      await local.customer.upsert({
        where: { id: cc.id },
        create: cc,
        update: cc,
      });
      pulled.customers++;
    }

    // C. Salesman mobile orders created on cloud
    const cloudSalesmanOrders = await neon.sale.findMany({
      where: {
        createdAt: { gt: lastSyncDate },
        salesmanId: { not: null },
      },
      include: { items: true },
    });
    for (const cso of cloudSalesmanOrders) {
      const { items, ...orderData } = cso;
      await local.sale.upsert({
        where: { id: orderData.id },
        create: orderData,
        update: orderData,
      });
      for (const it of items) {
        await local.saleItem.upsert({
          where: { id: it.id },
          create: it,
          update: it,
        });
      }
      pulled.salesmanOrders++;
    }

    // Save success timestamp
    const nowSync = new Date().toISOString();
    saveSyncMetadata(nowSync, 'SUCCESS', { pushed, pulled });

    clearProductsCache();
    clearDashboardCache();

    console.log('[Sync] Two-way sync completed successfully. Pushed:', pushed, 'Pulled:', pulled);
    return {
      success: true,
      message: 'Cloud Sync Kamyabi se mukammal ho gaya! Local records Cloud par upload ho gaye aur Mobile changes Local par update ho gayin.',
      timestamp: nowSync,
      pushed,
      pulled,
    };
  } finally {
    await local.$disconnect();
    await neon.$disconnect();
  }
}
