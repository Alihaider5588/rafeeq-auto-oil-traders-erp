import { prisma } from '../src/utils/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';


const Role = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  CASHIER: 'CASHIER',
  SALESMAN: 'SALESMAN',
};

const MovementType = {
  PURCHASE: 'PURCHASE',
  SALE: 'SALE',
  ADJUSTMENT: 'ADJUSTMENT',
};

const PaymentMethod = {
  CASH: 'CASH',
  ONLINE: 'ONLINE',
  CHEQUE: 'CHEQUE',
};

async function main() {
  console.log('Seeding initial data for RAFIQ AUTO & OIL TRADERS...');

  // 1. Initial Settings
  await prisma.systemSetting.upsert({
    where: { id: 'default-setting' },
    update: {},
    create: {
      id: 'default-setting',
      companyName: 'RAFIQ AUTO & OIL TRADERS',
      address: '54-Stop Near MCB Bank, Dipalpur Road, Okara',
      phone: '0306-9258573 / 0327-7497457',
      email: 'info@rafiqautooil.com',
      invoicePrefix: 'RAFIQ-INV-',
      purchasePrefix: 'RAFIQ-PUR-',
      currency: 'PKR',
      allowNegativeStock: false,
      requireOrderApproval: false,
    },
  });

  // 2. Create Users (Ensuring ONE Admin)
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const operatorHash = await bcrypt.hash('Operator@123', 10);
  const cashierHash = await bcrypt.hash('Cashier@123', 10);
  const salesmanHash = await bcrypt.hash('Salesman@123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'M. Shafiq (Proprietor)',
      phone: '03069258573',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const operator = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      username: 'operator',
      fullName: 'Kamran Akmal',
      phone: '03011234567',
      passwordHash: operatorHash,
      role: Role.OPERATOR,
      isActive: true,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: {
      username: 'cashier',
      fullName: 'Tariq Mehmood',
      phone: '03021234567',
      passwordHash: cashierHash,
      role: Role.CASHIER,
      isActive: true,
    },
  });

  const salesman = await prisma.user.upsert({
    where: { username: 'salesman' },
    update: {},
    create: {
      username: 'salesman',
      fullName: 'Bilal Khan (Field Sales)',
      phone: '03031234567',
      passwordHash: salesmanHash,
      role: Role.SALESMAN,
      isActive: true,
    },
  });

  // 3. Categories (Including required categories from specification)
  const categoriesData = [
    { name: 'Lubricant', description: 'Engine oils, gear oils, hydraulic fluids and transmission lubricants' },
    { name: 'Car Care', description: 'Car detailing, polishes, coolants, windshield wash and cleaners' },
    { name: 'Bike Care', description: 'Motorcycle 4T engine oils, chain lubes, fork oils and brake fluids' },
    { name: 'All Filter', description: 'Air filters, oil filters, fuel filters and cabin filters' },
    { name: 'Spare Part', description: 'Fast moving replacement spare parts, plugs and belts' },
    { name: 'Other', description: 'Miscellaneous automotive workshop items and accessories' },
    // Existing legacy category names for backward compatibility
    { name: 'Engine Oil', description: 'Passenger car and heavy duty commercial engine oils' },
    { name: 'Brake Oil', description: 'DOT 3 and DOT 4 hydraulic brake fluid' },
    { name: 'Gear Oil', description: 'Differential and manual/auto gearbox oils' },
    { name: 'Grease', description: 'Industrial and automotive chassis greases' },
    { name: 'Air Filter', description: 'Automotive air filter cartridges' },
    { name: 'Coolant', description: 'Radiator engine coolants and anti-freeze' },
    { name: 'Oil Filter', description: 'Spin-on oil filters and cartridge elements' },
  ];

  const categoryMap: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: { description: c.description },
      create: { name: c.name, description: c.description },
    });
    categoryMap[c.name] = cat.id;
  }

  // 4. Units
  const unitsData = [
    { name: 'Bottle', symbol: 'Btl' },
    { name: 'Piece', symbol: 'Pcs' },
    { name: 'Liter', symbol: 'Ltr' },
    { name: 'Can', symbol: 'Can' },
    { name: 'Box', symbol: 'Box' },
    { name: 'Carton', symbol: 'Ctn' },
    { name: 'Drum', symbol: 'Drum' },
    { name: 'Pack', symbol: 'Pack' },
  ];

  const unitMap: Record<string, string> = {};
  for (const u of unitsData) {
    const unit = await prisma.unit.upsert({
      where: { name: u.name },
      update: {},
      create: { name: u.name, symbol: u.symbol },
    });
    unitMap[u.name] = unit.id;
  }

  // 5. Products with primary and secondary units & public web fields
  const productsData = [
    {
      name: 'Total Quartz 9000 5W-40 (4L)',
      sku: 'TOT-9000-4L',
      category: 'Lubricant',
      brand: 'Total Energies',
      unit: 'Can',
      primaryUnit: 'Carton',
      conversionFactor: 4, // 1 Carton = 4 Cans
      purchasePrice: 6200,
      salePrice: 7500,
      wholesalePrice: 7100,
      minStock: 10,
      stock: 45,
      description: 'Fully synthetic high performance engine oil for petrol and diesel engines. API SP / ACEA A3/B4.',
      specifications: 'Viscosity: 5W-40, Volume: 4 Liters, Base: Fully Synthetic, Standard: API SP / CF',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
    },
    {
      name: 'Shell Helix HX7 10W-40 (4L)',
      sku: 'SHL-HX7-4L',
      category: 'Lubricant',
      brand: 'Shell',
      unit: 'Can',
      primaryUnit: 'Carton',
      conversionFactor: 4,
      purchasePrice: 4800,
      salePrice: 5900,
      wholesalePrice: 5600,
      minStock: 15,
      stock: 60,
      description: 'Synthetic technology motor oil with Active Cleansing Technology for modern passenger cars.',
      specifications: 'Viscosity: 10W-40, Volume: 4 Liters, Base: Semi-Synthetic, Standard: API SN Plus',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
    },
    {
      name: 'Havoline Formula 20W-50 (4L)',
      sku: 'HAV-20W50-4L',
      category: 'Lubricant',
      brand: 'Caltex Chevron',
      unit: 'Can',
      primaryUnit: 'Carton',
      conversionFactor: 6,
      purchasePrice: 3800,
      salePrice: 4600,
      wholesalePrice: 4350,
      minStock: 20,
      stock: 80,
      description: 'Proven performance multigrade motor oil formulated with Deposit Shield technology for engine durability.',
      specifications: 'Viscosity: 20W-50, Volume: 4 Liters, Base: Mineral, Standard: API SL / CF',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
    },
    {
      name: 'Castrol GTX 20W-50 (4L)',
      sku: 'CAS-GTX-4L',
      category: 'Lubricant',
      brand: 'Castrol',
      unit: 'Can',
      primaryUnit: 'Carton',
      conversionFactor: 6,
      purchasePrice: 4100,
      salePrice: 5100,
      wholesalePrice: 4800,
      minStock: 12,
      stock: 35,
      description: 'Superior anti-sludge protection for long engine life. Helps protect against engine problems.',
      specifications: 'Viscosity: 20W-50, Volume: 4 Liters, Base: Mineral, Standard: API SL',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
    },
    {
      name: 'Seiken Dot 4 Brake Oil (500ml)',
      sku: 'SEI-DOT4-500',
      category: 'Car Care',
      brand: 'Seiken Japan',
      unit: 'Bottle',
      primaryUnit: 'Box',
      conversionFactor: 24, // 1 Box = 24 Bottles
      purchasePrice: 450,
      salePrice: 650,
      wholesalePrice: 580,
      minStock: 25,
      stock: 120,
      description: 'Genuine Japanese high boiling point brake fluid for hydraulic disc and drum brake systems.',
      specifications: 'Grade: DOT 4, Volume: 500ml, Origin: Japan, Boiling Point: >260C',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
    },
    {
      name: 'Guard Air Filter AF-2101 (Corolla)',
      sku: 'GRD-AF-2101',
      category: 'All Filter',
      brand: 'Guard Filters',
      unit: 'Piece',
      primaryUnit: 'Carton',
      conversionFactor: 10,
      purchasePrice: 600,
      salePrice: 950,
      wholesalePrice: 850,
      minStock: 10,
      stock: 30,
      description: 'High efficiency automotive air filter element engineered for Toyota Corolla 2014-2022 models.',
      specifications: 'Material: Polyurethane Pleated Paper, Application: Toyota Corolla 1.3/1.6/1.8L',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
    },
    {
      name: 'Caltex Marfak Multipurpose Grease 3 (0.5kg)',
      sku: 'CAL-MARF-500',
      category: 'Car Care',
      brand: 'Caltex Chevron',
      unit: 'Can',
      primaryUnit: 'Box',
      conversionFactor: 12,
      purchasePrice: 850,
      salePrice: 1200,
      wholesalePrice: 1050,
      minStock: 15,
      stock: 50,
      description: 'Lithium thickener multipurpose grease for wheel bearings, chassis points and automotive lubrication.',
      specifications: 'Thickener: Lithium, NLGI Grade: 3, Weight: 500g, Operating Temp: -20C to 120C',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
    },
    {
      name: 'Havoline 4T Motorcycle Oil 20W-40 (0.7L)',
      sku: 'HAV-4T-700',
      category: 'Bike Care',
      brand: 'Caltex Chevron',
      unit: 'Bottle',
      primaryUnit: 'Carton',
      conversionFactor: 24, // 1 Carton = 24 Bottles
      purchasePrice: 520,
      salePrice: 700,
      wholesalePrice: 630,
      minStock: 30,
      stock: 144,
      description: 'High performance 4-stroke motorcycle engine oil formulated for smooth clutch operation and engine protection.',
      specifications: 'Viscosity: 20W-40, Volume: 700ml, Standard: JASO MA2 / API SG, Application: 70cc / 100cc / 125cc Bikes',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
    },
    {
      name: 'Denso Nickel Spark Plug K16R-U11',
      sku: 'DEN-K16R-U11',
      category: 'Spare Part',
      brand: 'Denso',
      unit: 'Piece',
      primaryUnit: 'Box',
      conversionFactor: 10,
      purchasePrice: 280,
      salePrice: 450,
      wholesalePrice: 380,
      minStock: 20,
      stock: 60,
      description: 'Patented U-Groove ground electrode provides better combustion efficiency and ignition reliability.',
      specifications: 'Thread: 14mm, Reach: 19mm, Hex: 16mm, Gap: 1.1mm',
      showOnWebsite: true,
      showInCatalog: true,
      showPublicPrice: true,
    },
  ];

  for (const p of productsData) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    const targetCatId = categoryMap[p.category] || categoryMap['Lubricant'] || Object.values(categoryMap)[0];
    const targetUnitId = unitMap[p.unit] || Object.values(unitMap)[0];
    const targetPrimaryUnitId = p.primaryUnit ? unitMap[p.primaryUnit] : null;

    if (!existing) {
      const prod = await prisma.product.create({
        data: {
          name: p.name,
          sku: p.sku,
          categoryId: targetCatId,
          brand: p.brand,
          unitId: targetUnitId,
          primaryUnitId: targetPrimaryUnitId,
          conversionFactor: new Prisma.Decimal(p.conversionFactor || 1),
          purchasePrice: new Prisma.Decimal(p.purchasePrice),
          salePrice: new Prisma.Decimal(p.salePrice),
          wholesalePrice: new Prisma.Decimal(p.wholesalePrice || p.salePrice),
          minimumStockLevel: new Prisma.Decimal(p.minStock),
          openingStock: new Prisma.Decimal(p.stock),
          currentStock: new Prisma.Decimal(p.stock),
          description: p.description,
          specifications: p.specifications,
          showOnWebsite: p.showOnWebsite ?? true,
          showInCatalog: p.showInCatalog ?? true,
          showPublicPrice: p.showPublicPrice ?? true,
        },
      });

      await prisma.stockMovement.create({
        data: {
          productId: prod.id,
          movementType: MovementType.ADJUSTMENT,
          quantity: new Prisma.Decimal(p.stock),
          previousStock: new Prisma.Decimal(0),
          newStock: new Prisma.Decimal(p.stock),
          description: 'Initial Opening Stock Seed',
        },
      });
    } else {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          primaryUnitId: targetPrimaryUnitId,
          conversionFactor: new Prisma.Decimal(p.conversionFactor || 1),
          wholesalePrice: new Prisma.Decimal(p.wholesalePrice || p.salePrice),
          description: p.description,
          specifications: p.specifications,
          showOnWebsite: p.showOnWebsite ?? true,
          showInCatalog: p.showInCatalog ?? true,
          showPublicPrice: p.showPublicPrice ?? true,
        },
      });
    }
  }

  // 6. Suppliers
  const sup1 = await prisma.supplier.upsert({
    where: { companyName: 'Shell Pakistan Distributor Multan' },
    update: {},
    create: {
      companyName: 'Shell Pakistan Distributor Multan',
      contactPerson: 'Mr. Asif Sheikh',
      phone: '03009876543',
      address: 'Industrial Area, Phase 2, Multan',
      openingBalance: new Prisma.Decimal(150000),
      currentPayable: new Prisma.Decimal(150000),
    },
  });

  const sup2 = await prisma.supplier.upsert({
    where: { companyName: 'Total Lubricants National Supply' },
    update: {},
    create: {
      companyName: 'Total Lubricants National Supply',
      contactPerson: 'Zubair Butt',
      phone: '03214567890',
      address: 'Near Dry Port, Lahore',
      openingBalance: new Prisma.Decimal(80000),
      currentPayable: new Prisma.Decimal(80000),
    },
  });

  // 7. Customers
  const cust1 = await prisma.customer.upsert({
    where: { phone: '03005551234' },
    update: {},
    create: {
      shopName: 'Bismillah Autos & Oil Traders',
      ownerName: 'Haji Rafiq',
      phone: '03005551234',
      address: 'Chowk Kumharanwala, Multan',
      area: 'Multan City',
      salesmanId: salesman.id,
      openingBalance: new Prisma.Decimal(45000),
      currentReceivable: new Prisma.Decimal(45000),
      creditLimit: new Prisma.Decimal(200000),
    },
  });

  const cust2 = await prisma.customer.upsert({
    where: { phone: '03337778899' },
    update: {},
    create: {
      shopName: 'Madina Auto Service & Spare',
      ownerName: 'Rashid Minhas',
      phone: '03337778899',
      address: 'Khanewal Road, Multan',
      area: 'Khanewal Sector',
      salesmanId: salesman.id,
      openingBalance: new Prisma.Decimal(12000),
      currentReceivable: new Prisma.Decimal(12000),
      creditLimit: new Prisma.Decimal(100000),
    },
  });

  // 8. Vehicle & Logistics
  await prisma.vehicle.upsert({
    where: { vehicleNumber: 'MN-786-LHR' },
    update: {},
    create: {
      vehicleNumber: 'MN-786-LHR',
      driverName: 'Muhammad Ali',
      driverPhone: '03049988776',
      supplyManName: 'Ahmed Raza',
      notes: 'Shehzore Delivery Van #1',
    },
  });

  // 9. Confidential Owner Brand Sample Records (Isolated)
  const existingOwnerBrandProd = await prisma.ownerBrandProduct.findFirst({
    where: { sku: 'OB-LUB-PRO-1' },
  });
  if (!existingOwnerBrandProd) {
    await prisma.ownerBrandProduct.create({
      data: {
        name: 'Rafiq Supreme Platinum 20W-50 Engine Oil',
        sku: 'OB-LUB-PRO-1',
        brandName: 'Rafiq Special Blend',
        category: 'Lubricant',
        unit: 'Can',
        purchaseCost: new Prisma.Decimal(2800),
        salePrice: new Prisma.Decimal(4200),
        currentStock: new Prisma.Decimal(120),
        minimumStockLevel: new Prisma.Decimal(20),
        notes: 'Confidential proprietary blend formulation packaged for direct retail.',
      },
    });
  }

  // 10. Sample Expenses
  const existingExpense = await prisma.expense.findFirst();
  if (!existingExpense) {
    await prisma.expense.create({
      data: {
        category: 'Electricity',
        amount: new Prisma.Decimal(14500),
        paymentMethod: 'CASH',
        description: 'LESCO / Mepco Shop Electricity Bill - September',
        recordedById: admin.id,
      },
    });
  }

  console.log('Seed completed successfully with all required categories and units!');
  console.log('Credentials:');
  console.log('ADMIN:    username: admin,    password: Admin@123');
  console.log('OPERATOR: username: operator, password: Operator@123');
  console.log('CASHIER:  username: cashier,  password: Cashier@123');
  console.log('SALESMAN: username: salesman, password: Salesman@123');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
