"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
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
    const passwordHash = await bcryptjs_1.default.hash('Admin@123', 10);
    const operatorHash = await bcryptjs_1.default.hash('Operator@123', 10);
    const cashierHash = await bcryptjs_1.default.hash('Cashier@123', 10);
    const salesmanHash = await bcryptjs_1.default.hash('Salesman@123', 10);
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            fullName: 'M. Shafiq & Talha Sabir (Proprietors)',
            phone: '03069258573',
            passwordHash,
            role: client_1.Role.ADMIN,
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
            role: client_1.Role.OPERATOR,
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
            role: client_1.Role.CASHIER,
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
            role: client_1.Role.SALESMAN,
            isActive: true,
        },
    });
    // 3. Categories
    const categoriesData = [
        'Engine Oil',
        'Brake Oil',
        'Gear Oil',
        'Grease',
        'Air Filter',
        'Coolant',
        'Oil Filter',
        'Hydraulic Oil',
        'Other',
    ];
    const categoryMap = {};
    for (const name of categoriesData) {
        const cat = await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name, description: `${name} products catalog` },
        });
        categoryMap[name] = cat.id;
    }
    // 4. Units
    const unitsData = [
        { name: 'Piece', symbol: 'Pcs' },
        { name: 'Liter', symbol: 'Ltr' },
        { name: 'Bottle', symbol: 'Btl' },
        { name: 'Can', symbol: 'Can' },
        { name: 'Box', symbol: 'Box' },
        { name: 'Carton', symbol: 'Ctn' },
        { name: 'Drum', symbol: 'Drum' },
    ];
    const unitMap = {};
    for (const u of unitsData) {
        const unit = await prisma.unit.upsert({
            where: { name: u.name },
            update: {},
            create: { name: u.name, symbol: u.symbol },
        });
        unitMap[u.name] = unit.id;
    }
    // 5. Products
    const productsData = [
        {
            name: 'Total Quartz 9000 5W-40 (4L)',
            sku: 'TOT-9000-4L',
            category: 'Engine Oil',
            brand: 'Total Energies',
            unit: 'Can',
            purchasePrice: 6200,
            salePrice: 7500,
            minStock: 10,
            stock: 45,
        },
        {
            name: 'Shell Helix HX7 10W-40 (4L)',
            sku: 'SHL-HX7-4L',
            category: 'Engine Oil',
            brand: 'Shell',
            unit: 'Can',
            purchasePrice: 4800,
            salePrice: 5900,
            minStock: 15,
            stock: 60,
        },
        {
            name: 'Havoline Formula 20W-50 (4L)',
            sku: 'HAV-20W50-4L',
            category: 'Engine Oil',
            brand: 'Caltex Chevron',
            unit: 'Can',
            purchasePrice: 3800,
            salePrice: 4600,
            minStock: 20,
            stock: 80,
        },
        {
            name: 'Castrol GTX 20W-50 (4L)',
            sku: 'CAS-GTX-4L',
            category: 'Engine Oil',
            brand: 'Castrol',
            unit: 'Can',
            purchasePrice: 4100,
            salePrice: 5100,
            minStock: 12,
            stock: 35,
        },
        {
            name: 'Seiken Dot 4 Brake Oil (500ml)',
            sku: 'SEI-DOT4-500',
            category: 'Brake Oil',
            brand: 'Seiken',
            unit: 'Bottle',
            purchasePrice: 450,
            salePrice: 650,
            minStock: 25,
            stock: 120,
        },
        {
            name: 'Guard Air Filter AF-2101 (Corolla)',
            sku: 'GRD-AF-2101',
            category: 'Air Filter',
            brand: 'Guard Filters',
            unit: 'Piece',
            purchasePrice: 600,
            salePrice: 950,
            minStock: 10,
            stock: 30,
        },
        {
            name: 'Caltex Marfak Multipurpose Grease 3 (0.5kg)',
            sku: 'CAL-MARF-500',
            category: 'Grease',
            brand: 'Caltex Chevron',
            unit: 'Can',
            purchasePrice: 850,
            salePrice: 1200,
            minStock: 15,
            stock: 50,
        },
    ];
    for (const p of productsData) {
        const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
        if (!existing) {
            const prod = await prisma.product.create({
                data: {
                    name: p.name,
                    sku: p.sku,
                    categoryId: categoryMap[p.category],
                    brand: p.brand,
                    unitId: unitMap[p.unit],
                    purchasePrice: new client_1.Prisma.Decimal(p.purchasePrice),
                    salePrice: new client_1.Prisma.Decimal(p.salePrice),
                    minimumStockLevel: new client_1.Prisma.Decimal(p.minStock),
                    openingStock: new client_1.Prisma.Decimal(p.stock),
                    currentStock: new client_1.Prisma.Decimal(p.stock),
                },
            });
            await prisma.stockMovement.create({
                data: {
                    productId: prod.id,
                    movementType: client_1.MovementType.ADJUSTMENT,
                    quantity: new client_1.Prisma.Decimal(p.stock),
                    previousStock: new client_1.Prisma.Decimal(0),
                    newStock: new client_1.Prisma.Decimal(p.stock),
                    description: 'Initial Opening Stock Seed',
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
            openingBalance: new client_1.Prisma.Decimal(150000),
            currentPayable: new client_1.Prisma.Decimal(150000),
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
            openingBalance: new client_1.Prisma.Decimal(80000),
            currentPayable: new client_1.Prisma.Decimal(80000),
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
            openingBalance: new client_1.Prisma.Decimal(45000),
            currentReceivable: new client_1.Prisma.Decimal(45000),
            creditLimit: new client_1.Prisma.Decimal(200000),
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
            openingBalance: new client_1.Prisma.Decimal(12000),
            currentReceivable: new client_1.Prisma.Decimal(12000),
            creditLimit: new client_1.Prisma.Decimal(100000),
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
    console.log('Seed completed successfully!');
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
