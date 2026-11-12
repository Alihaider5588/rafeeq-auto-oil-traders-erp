require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient: PostgresClient } = require('../node_modules/@prisma/client-postgres');
const { PrismaClient: SqliteClient } = require('../node_modules/@prisma/client');
const fs = require('fs');
const path = require('path');

async function pullFullCloudData() {
  console.log('[Full Pull] Connecting to Neon Cloud PostgreSQL and local SQLite...');
  const neon = new PostgresClient({
    datasources: { db: { url: process.env.NEON_DATABASE_URL } },
    log: ['error']
  });
  const local = new SqliteClient({
    log: ['error']
  });

  const stats = {};

  try {
    await neon.$connect();
    console.log('[Full Pull] Connected to Neon PostgreSQL.');
    await local.$connect();
    console.log('[Full Pull] Connected to local SQLite.');

    // Disable foreign keys in SQLite for fast batch import
    await local.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

    // 1. Users
    console.log('[1/18] Pulling Users...');
    const users = await neon.user.findMany();
    for (const u of users) {
      await local.user.upsert({ where: { id: u.id }, create: u, update: u });
    }
    stats.users = users.length;
    console.log(`  -> Synced ${users.length} users.`);

    // 2. Categories
    console.log('[2/18] Pulling Categories...');
    const categories = await neon.category.findMany();
    for (const c of categories) {
      await local.category.upsert({ where: { id: c.id }, create: c, update: c });
    }
    stats.categories = categories.length;
    console.log(`  -> Synced ${categories.length} categories.`);

    // 3. Units
    console.log('[3/18] Pulling Units & Packaging...');
    const units = await neon.unit.findMany();
    for (const un of units) {
      await local.unit.upsert({ where: { id: un.id }, create: un, update: un });
    }
    stats.units = units.length;
    console.log(`  -> Synced ${units.length} units.`);

    // 4. Suppliers
    console.log('[4/18] Pulling Suppliers & Mills...');
    const suppliers = await neon.supplier.findMany();
    for (const s of suppliers) {
      await local.supplier.upsert({ where: { id: s.id }, create: s, update: s });
    }
    stats.suppliers = suppliers.length;
    console.log(`  -> Synced ${suppliers.length} suppliers.`);

    // 5. Customers
    console.log('[5/18] Pulling Customers & Khata Accounts...');
    const customers = await neon.customer.findMany();
    for (const cust of customers) {
      await local.customer.upsert({ where: { id: cust.id }, create: cust, update: cust });
    }
    stats.customers = customers.length;
    console.log(`  -> Synced ${customers.length} customers.`);

    // 6. Products
    console.log('[6/18] Pulling Products Catalog...');
    const products = await neon.product.findMany();
    for (const p of products) {
      await local.product.upsert({ where: { id: p.id }, create: p, update: p });
    }
    stats.products = products.length;
    console.log(`  -> Synced ${products.length} products.`);

    // 7. Customer Rates
    console.log('[7/18] Pulling Special Party Rates...');
    const rates = await neon.customerProductRate.findMany();
    for (const r of rates) {
      await local.customerProductRate.upsert({ where: { id: r.id }, create: r, update: r });
    }
    stats.rates = rates.length;
    console.log(`  -> Synced ${rates.length} custom rates.`);

    // 8. Purchases & Purchase Items
    console.log('[8/18] Pulling Purchases & Line Items...');
    const purchases = await neon.purchase.findMany({ include: { items: true } });
    for (const pur of purchases) {
      const { items, ...purchaseData } = pur;
      await local.purchase.upsert({
        where: { id: purchaseData.id },
        create: purchaseData,
        update: purchaseData,
      });
      for (const it of items) {
        await local.purchaseItem.upsert({
          where: { id: it.id },
          create: it,
          update: it,
        });
      }
    }
    stats.purchases = purchases.length;
    console.log(`  -> Synced ${purchases.length} purchases.`);

    // 9. Sales & Sale Items
    console.log('[9/18] Pulling Sales Register & Invoices...');
    const sales = await neon.sale.findMany({ include: { items: true } });
    for (const s of sales) {
      const { items, ...saleData } = s;
      await local.sale.upsert({
        where: { id: saleData.id },
        create: saleData,
        update: saleData,
      });
      for (const it of items) {
        await local.saleItem.upsert({
          where: { id: it.id },
          create: it,
          update: it,
        });
      }
    }
    stats.sales = sales.length;
    console.log(`  -> Synced ${sales.length} sales invoices.`);

    // 10. Customer Ledgers
    console.log('[10/18] Pulling Customer Ledger Khatajaat...');
    const custLedgers = await neon.customerLedger.findMany();
    for (const cl of custLedgers) {
      await local.customerLedger.upsert({ where: { id: cl.id }, create: cl, update: cl });
    }
    stats.customerLedgers = custLedgers.length;
    console.log(`  -> Synced ${custLedgers.length} customer ledger entries.`);

    // 11. Supplier Ledgers
    console.log('[11/18] Pulling Supplier Ledgers...');
    const supLedgers = await neon.supplierLedger.findMany();
    for (const sl of supLedgers) {
      await local.supplierLedger.upsert({ where: { id: sl.id }, create: sl, update: sl });
    }
    stats.supplierLedgers = supLedgers.length;
    console.log(`  -> Synced ${supLedgers.length} supplier ledger entries.`);

    // 12. Payments
    console.log('[12/18] Pulling Payment Vouchers...');
    const payments = await neon.payment.findMany();
    for (const pay of payments) {
      await local.payment.upsert({ where: { id: pay.id }, create: pay, update: pay });
    }
    stats.payments = payments.length;
    console.log(`  -> Synced ${payments.length} payments.`);

    // 13. Expenses
    console.log('[13/18] Pulling Expenses...');
    const expenses = await neon.expense.findMany();
    for (const exp of expenses) {
      await local.expense.upsert({ where: { id: exp.id }, create: exp, update: exp });
    }
    stats.expenses = expenses.length;
    console.log(`  -> Synced ${expenses.length} expenses.`);

    // 14. Vehicles & Routes
    console.log('[14/18] Pulling Delivery Fleet...');
    const vehicles = await neon.vehicle.findMany();
    for (const v of vehicles) {
      await local.vehicle.upsert({ where: { id: v.id }, create: v, update: v });
    }
    stats.vehicles = vehicles.length;

    const schedules = await neon.deliveryRouteSchedule.findMany().catch(() => []);
    for (const sch of schedules) {
      await local.deliveryRouteSchedule.upsert({ where: { id: sch.id }, create: sch, update: sch });
    }
    stats.schedules = schedules.length;

    const deliveries = await neon.dailyDelivery.findMany({ include: { items: true } }).catch(() => []);
    for (const del of deliveries) {
      const { items, ...delData } = del;
      await local.dailyDelivery.upsert({
        where: { id: delData.id },
        create: delData,
        update: delData,
      });
      for (const it of items) {
        await local.deliveryItem.upsert({
          where: { id: it.id },
          create: it,
          update: it,
        });
      }
    }
    stats.deliveries = deliveries.length;
    console.log(`  -> Synced ${vehicles.length} vehicles and ${deliveries.length} dispatches.`);

    // 15. Stock Movements
    console.log('[15/18] Pulling Stock Movements...');
    const movements = await neon.stockMovement.findMany().catch(() => []);
    for (const sm of movements) {
      await local.stockMovement.upsert({ where: { id: sm.id }, create: sm, update: sm });
    }
    stats.movements = movements.length;
    console.log(`  -> Synced ${movements.length} stock movements.`);

    // 16. Employees, Attendance, Payroll
    console.log('[16/18] Pulling Staff & Payroll...');
    const employees = await neon.employee.findMany().catch(() => []);
    for (const emp of employees) {
      await local.employee.upsert({ where: { id: emp.id }, create: emp, update: emp });
    }
    stats.employees = employees.length;

    const attendances = await neon.attendance.findMany().catch(() => []);
    for (const att of attendances) {
      await local.attendance.upsert({ where: { id: att.id }, create: att, update: att });
    }
    stats.attendances = attendances.length;

    const payrolls = await neon.payroll.findMany().catch(() => []);
    for (const p of payrolls) {
      await local.payroll.upsert({ where: { id: p.id }, create: p, update: p });
    }
    stats.payrolls = payrolls.length;
    console.log(`  -> Synced ${employees.length} employees, ${payrolls.length} payrolls.`);

    // 17. System Settings
    console.log('[17/18] Pulling System Settings...');
    const settings = await neon.systemSetting.findMany().catch(() => []);
    for (const st of settings) {
      await local.systemSetting.upsert({ where: { id: st.id }, create: st, update: st });
    }
    stats.settings = settings.length;

    // 18. Re-enable foreign keys
    console.log('[18/18] Finalizing database...');
    await local.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

    // Save sync metadata
    const syncTime = new Date().toISOString();
    const metaPath = path.join(__dirname, '../prisma/sync_metadata.json');
    fs.writeFileSync(metaPath, JSON.stringify({
      lastSyncTime: syncTime,
      lastSyncStatus: 'SUCCESS',
      stats: { mode: 'FULL_CLOUD_PULL', stats },
      updatedAt: syncTime,
    }, null, 2), 'utf8');

    console.log('=====================================================================');
    console.log('🎉 FULL RECORD SYNCHRONIZATION COMPLETED SUCCESSFULLY!');
    console.log(JSON.stringify(stats, null, 2));
    console.log('=====================================================================');
  } catch (err) {
    console.error('Failed to sync full cloud data:', err);
    process.exit(1);
  } finally {
    await local.$disconnect();
    await neon.$disconnect();
  }
}

pullFullCloudData();
