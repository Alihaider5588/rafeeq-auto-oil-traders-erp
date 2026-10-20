import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient as SqliteClient } from '@prisma/client';
import { PrismaClient as PostgresClient } from '@prisma/client-postgres';

async function migrate() {
  const neonUrl = process.env.NEON_DATABASE_URL;

  if (!neonUrl || neonUrl.trim() === '') {
    console.error('================================================================');
    console.error('FATAL ERROR: NEON_DATABASE_URL environment variable is not set.');
    console.error('Please set $env:NEON_DATABASE_URL in PowerShell before running this script:');
    console.error('$env:NEON_DATABASE_URL = (Get-Clipboard -Raw).Trim()');
    console.error('================================================================');
    process.exit(1);
  }

  console.log('================================================================');
  console.log('Starting SQLite -> Neon PostgreSQL Data Migration');
  console.log('================================================================');

  process.env.NEON_DATABASE_URL = neonUrl.trim();

  const sqlite = new SqliteClient();
  const postgres = new PostgresClient({
    datasourceUrl: neonUrl.trim(),
    datasources: {
      db: {
        url: neonUrl.trim(),
      },
    },
  });

  try {
    console.log('[1/4] Connecting to databases...');
    await sqlite.$connect();
    await postgres.$connect();
    console.log('[1/4] Connected successfully to both SQLite and Neon PostgreSQL.');

    // Migration models ordered by relational foreign key dependency
    const modelsToMigrate: { name: string; key: keyof typeof sqlite & keyof typeof postgres }[] = [
      // Independent Core Entities
      { name: 'User', key: 'user' },
      { name: 'Category', key: 'category' },
      { name: 'Unit', key: 'unit' },
      { name: 'SystemSetting', key: 'systemSetting' },
      { name: 'Vehicle', key: 'vehicle' },
      { name: 'Supplier', key: 'supplier' },
      { name: 'Customer', key: 'customer' },
      { name: 'Employee', key: 'employee' },
      { name: 'OwnerBrandSupplier', key: 'ownerBrandSupplier' },
      { name: 'PublicInquiry', key: 'publicInquiry' },

      // Dependent on Core Entities
      { name: 'Product', key: 'product' },
      { name: 'OwnerBrandProduct', key: 'ownerBrandProduct' },
      { name: 'CustomerProductRate', key: 'customerProductRate' },
      { name: 'Expense', key: 'expense' },
      { name: 'Attendance', key: 'attendance' },
      { name: 'Payroll', key: 'payroll' },
      { name: 'DeliveryRouteSchedule', key: 'deliveryRouteSchedule' },
      { name: 'DailyDelivery', key: 'dailyDelivery' },
      { name: 'DeliveryItem', key: 'deliveryItem' },

      // Purchases & Sales
      { name: 'Purchase', key: 'purchase' },
      { name: 'PurchaseItem', key: 'purchaseItem' },
      { name: 'Sale', key: 'sale' },
      { name: 'SaleItem', key: 'saleItem' },
      { name: 'Payment', key: 'payment' },
      { name: 'CustomerLedger', key: 'customerLedger' },
      { name: 'SupplierLedger', key: 'supplierLedger' },
      { name: 'StockMovement', key: 'stockMovement' },
      { name: 'SalesReturn', key: 'salesReturn' },
      { name: 'SalesReturnItem', key: 'salesReturnItem' },
      { name: 'PurchaseReturn', key: 'purchaseReturn' },
      { name: 'PurchaseReturnItem', key: 'purchaseReturnItem' },
      { name: 'CashSummary', key: 'cashSummary' },

      // Web Orders & Owner Brand Transactions
      { name: 'WebOrder', key: 'webOrder' },
      { name: 'WebOrderItem', key: 'webOrderItem' },
      { name: 'OwnerBrandPurchase', key: 'ownerBrandPurchase' },
      { name: 'OwnerBrandPurchaseItem', key: 'ownerBrandPurchaseItem' },
      { name: 'OwnerBrandSale', key: 'ownerBrandSale' },
      { name: 'OwnerBrandSaleItem', key: 'ownerBrandSaleItem' },
      { name: 'OwnerBrandStockMovement', key: 'ownerBrandStockMovement' },
      { name: 'AuditLog', key: 'auditLog' },
    ];

    console.log('[2/4] Beginning sequential model data migration...');

    let totalMigratedRecords = 0;

    for (const { name, key } of modelsToMigrate) {
      const sqliteModel = sqlite[key] as any;
      const postgresModel = postgres[key] as any;

      if (!sqliteModel || !postgresModel) {
        console.warn(`[SKIP] Model ${name} is not present on both clients.`);
        continue;
      }

      const records = await sqliteModel.findMany();

      if (!records || records.length === 0) {
        console.log(`- ${name}: 0 records in SQLite (skipped)`);
        continue;
      }

      try {
        const result = await postgresModel.createMany({
          data: records,
          skipDuplicates: true,
        });

        const insertedCount = result?.count ?? records.length;
        totalMigratedRecords += insertedCount;
        console.log(`✓ ${name}: ${records.length} records found in SQLite -> ${insertedCount} migrated to Neon.`);
      } catch (insertError: any) {
        console.error(`✗ Error migrating model ${name}:`, insertError?.message || insertError);
      }
    }

    console.log('================================================================');
    console.log(`[3/4] Migration process complete. Total migrated records: ${totalMigratedRecords}`);
    console.log('================================================================');
  } catch (error: any) {
    console.error('FATAL ERROR DURING MIGRATION:', error?.message || error);
    throw error;
  } finally {
    console.log('[4/4] Disconnecting from database clients...');
    await Promise.allSettled([
      sqlite.$disconnect(),
      postgres.$disconnect(),
    ]);
    console.log('Database clients disconnected cleanly.');
  }
}

migrate()
  .then(() => {
    console.log('SQLite -> PostgreSQL Migration script finished successfully.');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
