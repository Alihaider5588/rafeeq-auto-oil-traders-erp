import request from 'supertest';
import app from '../server';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '../types/enums';

describe('RAFEEQUE OIL TRADERS — UPGRADE VERIFICATION SUITE', () => {
  let adminToken: string;
  let operatorToken: string;
  let cashierToken: string;
  let salesmanToken: string;

  let testCustomerId: string;
  let testCustomer2Id: string;
  let testProductId: string;
  let testUnitId: string;
  let testPrimaryUnitId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    // 1. Ensure test users exist and get their tokens
    const loginUser = async (identifier: string, pass: string) => {
      const res = await request(app).post('/api/auth/login').send({ identifier, password: pass });
      return res.body.token;
    };

    adminToken = await loginUser('admin', 'Admin@123');
    operatorToken = await loginUser('operator', 'Operator@123');
    cashierToken = await loginUser('cashier', 'Cashier@123');
    salesmanToken = await loginUser('salesman', 'Salesman@123');

    // 2. Setup Units & Categories
    const unitBottle = await prisma.unit.upsert({
      where: { name: 'Test Bottle' },
      update: {},
      create: { name: 'Test Bottle', symbol: 'tBtl' },
    });
    testUnitId = unitBottle.id;

    const unitCarton = await prisma.unit.upsert({
      where: { name: 'Test Carton' },
      update: {},
      create: { name: 'Test Carton', symbol: 'tCtn' },
    });
    testPrimaryUnitId = unitCarton.id;

    const cat = await prisma.category.upsert({
      where: { name: 'Test Lubricant' },
      update: {},
      create: { name: 'Test Lubricant', description: 'Test category' },
    });
    testCategoryId = cat.id;

    // 3. Setup Customers
    const cust1 = await prisma.customer.upsert({
      where: { phone: '03009990001' },
      update: {},
      create: {
        shopName: 'Test Shop A',
        ownerName: 'Owner A',
        phone: '03009990001',
        openingBalance: 0,
        currentReceivable: 0,
      },
    });
    testCustomerId = cust1.id;

    const cust2 = await prisma.customer.upsert({
      where: { phone: '03009990002' },
      update: {},
      create: {
        shopName: 'Test Shop B',
        ownerName: 'Owner B',
        phone: '03009990002',
        openingBalance: 0,
        currentReceivable: 0,
      },
    });
    testCustomer2Id = cust2.id;

    // 4. Create a test product with conversion factor (1 Carton = 12 Bottles)
    const p = await prisma.product.upsert({
      where: { sku: 'TEST-SKU-CONV-1' },
      update: {
        currentStock: 240, // 240 bottles (= 20 cartons)
        showOnWebsite: true,
        showInCatalog: true,
        showPublicPrice: true,
      },
      create: {
        name: 'Test Oil 20W-50',
        sku: 'TEST-SKU-CONV-1',
        categoryId: testCategoryId,
        brand: 'TestBrand',
        unitId: testUnitId,
        primaryUnitId: testPrimaryUnitId,
        conversionFactor: 12, // 1 Carton = 12 Bottles
        purchasePrice: 1000,
        salePrice: 1500,
        wholesalePrice: 1400,
        openingStock: 240,
        currentStock: 240,
        description: 'Test Public Description',
        specifications: 'Grade 20W-50, 1L Pack',
        showOnWebsite: true,
        showInCatalog: true,
        showPublicPrice: true,
      },
    });
    testProductId = p.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ==========================================
  // SECTION 1: PUBLIC PRODUCT WEBSITE & CATALOG
  // ==========================================
  describe('1. Public Product Website & Catalog Protection', () => {
    it('GET /api/public/products returns only active products with showOnWebsite: true', async () => {
      const res = await request(app).get('/api/public/products');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      for (const item of res.body.data) {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('sku');
        expect(item).toHaveProperty('brand');
        // STRICT SECURITY: Must NOT expose purchasePrice, supplier, or internal ledger info
        expect(item).not.toHaveProperty('purchasePrice');
        expect(item).not.toHaveProperty('purchaseCost');
        expect(item).not.toHaveProperty('wholesalePrice');
        expect(item).not.toHaveProperty('supplier');
      }
    });

    it('GET /api/public/products/:id returns detailed specs for public product', async () => {
      const res = await request(app).get(`/api/public/products/${testProductId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.product.sku).toBe('TEST-SKU-CONV-1');
      expect(res.body.product.conversionFactor).toBe(12);
      expect(res.body.product.publicPrice).toBe(1500);
    });

    it('GET /api/public/categories returns categories with count of public products', async () => {
      const res = await request(app).get('/api/public/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThan(0);
    });

    it('POST /api/public/contact receives visitor inquiry without requiring auth', async () => {
      const res = await request(app).post('/api/public/contact').send({
        name: 'Public Customer Test',
        phone: '03211234567',
        email: 'customer@example.com',
        subject: 'Wholesale Bulk Order Query',
        message: 'We need 50 cartons of 20W-50 oil delivered to Dipalpur.',
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('inquiryId');
    });
  });

  // ==========================================
  // SECTION 2: PRIMARY & SECONDARY UNIT CONVERSIONS
  // ==========================================
  describe('2. Primary & Secondary Unit Conversions in POS Sales', () => {
    it('Selling in PRIMARY units (e.g. Cartons) correctly reduces stock in base units (Bottles)', async () => {
      const initialProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      const initialStock = Number(initialProduct!.currentStock);

      // Selling 2 Cartons (where 1 Carton = 12 Bottles -> should deduct 24 Bottles)
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          items: [
            {
              productId: testProductId,
              quantity: 2,
              unitType: 'PRIMARY',
              unitPrice: 16800, // Rs. 16,800 per carton (= 1400/bottle)
            },
          ],
          receivedAmount: 33600,
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const updatedProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      const updatedStock = Number(updatedProduct!.currentStock);

      // Verify exactly 24 bottles deducted
      expect(updatedStock).toBe(initialStock - 24);
    });

    it('Selling in SECONDARY units (Bottles) deducts exact quantity without multiplying', async () => {
      const initialProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      const initialStock = Number(initialProduct!.currentStock);

      // Selling 5 Bottles
      const res = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId: testCustomerId,
          items: [
            {
              productId: testProductId,
              quantity: 5,
              unitType: 'SECONDARY',
              unitPrice: 1500,
            },
          ],
          receivedAmount: 7500,
          paymentMethod: 'CASH',
        });

      expect(res.status).toBe(201);
      const updatedProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(Number(updatedProduct!.currentStock)).toBe(initialStock - 5);
    });
  });

  // ==========================================
  // SECTION 3: CUSTOMER/PARTY-WISE PRODUCT RATE HISTORY
  // ==========================================
  describe('3. Customer/Party-Wise Product Rate History', () => {
    it('Returns standard price for a customer who never purchased before', async () => {
      // Create a brand new customer with no purchase history
      const freshCust = await prisma.customer.create({
        data: {
          shopName: `Fresh New Customer ${Date.now()}`,
          ownerName: 'Fresh Owner',
          phone: `0300${Math.floor(1000000 + Math.random() * 9000000)}`,
          openingBalance: 0,
          currentReceivable: 0,
        },
      });

      const res = await request(app)
        .get(`/api/sales/customer-rate?customerId=${freshCust.id}&productId=${testProductId}&unitType=SECONDARY`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.hasHistory).toBe(false);
      expect(res.body.suggestedRate).toBe(1500); // Standard sale price
    });

    it('Records negotiated selling price on sale and suggests it for future sales to that customer', async () => {
      const negotiatedRate = 1425; // Special price for Customer B

      // 1. Complete sale with negotiated price
      const saleRes = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          customerId: testCustomer2Id,
          items: [
            {
              productId: testProductId,
              quantity: 10,
              unitType: 'SECONDARY',
              unitPrice: negotiatedRate,
            },
          ],
          receivedAmount: negotiatedRate * 10,
          paymentMethod: 'CASH',
        });
      expect(saleRes.status).toBe(201);

      // 2. Next time Customer B purchases, query customer-rate
      const rateRes = await request(app)
        .get(`/api/sales/customer-rate?customerId=${testCustomer2Id}&productId=${testProductId}&unitType=SECONDARY`)
        .set('Authorization', `Bearer ${salesmanToken}`);

      expect(rateRes.status).toBe(200);
      expect(rateRes.body.hasHistory).toBe(true);
      expect(rateRes.body.suggestedRate).toBe(negotiatedRate);
      expect(rateRes.body).toHaveProperty('lastInvoiceNumber');
      expect(rateRes.body).toHaveProperty('rateHistory');
      expect(rateRes.body.rateHistory[0].unitPrice).toBe(negotiatedRate);
    });

    it('Does NOT apply Customer B negotiated rate to Customer A', async () => {
      const rateResA = await request(app)
        .get(`/api/sales/customer-rate?customerId=${testCustomerId}&productId=${testProductId}&unitType=SECONDARY`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(rateResA.status).toBe(200);
      // Customer A last purchased at 1500, not Customer B's 1425
      expect(rateResA.body.suggestedRate).toBe(1500);
    });
  });

  // ==========================================
  // SECTION 4: CONFIDENTIAL OWNER BRAND MODULE
  // ==========================================
  describe('4. Confidential Owner Brand Module Security', () => {
    it('Strictly rejects non-admin roles (Operator, Cashier, Salesman) with 403 Forbidden', async () => {
      // Operator attempt
      const resOp = await request(app)
        .get('/api/owner-brand/products')
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(resOp.status).toBe(403);

      // Cashier attempt
      const resCash = await request(app)
        .get('/api/owner-brand/products')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(resCash.status).toBe(403);

      // Salesman attempt
      const resSales = await request(app)
        .get('/api/owner-brand/products')
        .set('Authorization', `Bearer ${salesmanToken}`);
      expect(resSales.status).toBe(403);
    });

    it('Rejects unverified Admin access without owner verification token', async () => {
      const res = await request(app)
        .get('/api/owner-brand/products')
        .set('Authorization', `Bearer ${adminToken}`);
      // Must require re-verification header 'x-owner-token'
      expect(res.status).toBe(401);
    });

    it('Allows Admin access after successful password re-verification', async () => {
      // 1. Password verification
      const verifyRes = await request(app)
        .post('/api/owner-brand/verify-access')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'Admin@123' });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body).toHaveProperty('ownerToken');

      const ownerToken = verifyRes.body.ownerToken;

      // 2. Access confidential products with ownerToken
      const prodRes = await request(app)
        .get('/api/owner-brand/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-owner-token', ownerToken);

      expect(prodRes.status).toBe(200);
      expect(prodRes.body.success).toBe(true);
      expect(Array.isArray(prodRes.body.products)).toBe(true);
    });

    it('Confidential owner brand products NEVER leak into public products API', async () => {
      const publicRes = await request(app).get('/api/public/products?search=Rafiq Supreme');
      expect(publicRes.status).toBe(200);
      // Must NOT contain confidential owner brand item
      const found = publicRes.body.data.find((p: any) => p.sku === 'OB-LUB-PRO-1');
      expect(found).toBeUndefined();
    });
  });

  // ==========================================
  // SECTION 5: SMALL BUSINESS EXPENSES (VYAPAR)
  // ==========================================
  describe('5. Small Business Expenses Workflow', () => {
    it('Records expense and calculates aggregates correctly', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          category: 'Tea/Refreshment',
          amount: 650,
          paymentMethod: 'CASH',
          description: 'Daily counter tea & biscuits for customers',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.expense.category).toBe('Tea/Refreshment');

      const listRes = await request(app)
        .get('/api/expenses?category=Tea/Refreshment')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.success).toBe(true);
      expect(listRes.body.totalAmount).toBeGreaterThanOrEqual(650);
    });
  });

  // ==========================================
  // SECTION 6: EMPLOYEES, ATTENDANCE & PAYROLL
  // ==========================================
  describe('6. Employees, Attendance & Payroll Module', () => {
    let employeeId: string;

    it('Creates an employee record (Admin only)', async () => {
      const uniqueCode = `EMP-TEST-${Date.now().toString().slice(-4)}`;
      const res = await request(app)
        .post('/api/hr/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeCode: uniqueCode,
          fullName: 'Muhammad Usman (Van Driver)',
          phone: `0309${Date.now().toString().slice(-7)}`,
          designation: 'Delivery Van Driver',
          salaryType: 'MONTHLY',
          basicSalary: 35000,
          allowances: 2000,
          workSchedule: '6 Days / Week (9am - 8pm)',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.employee.employeeCode).toBe(uniqueCode);
      employeeId = res.body.employee.id;
    });

    it('Disallows non-admin from creating employee', async () => {
      const res = await request(app)
        .post('/api/hr/employees')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({
          employeeCode: 'EMP-DENIED',
          fullName: 'Unauthorized Creation',
          phone: '03099999999',
          designation: 'Clerk',
          basicSalary: 20000,
        });

      expect(res.status).toBe(403);
    });

    it('Logs date-wise daily attendance', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/hr/attendance')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          employeeId,
          date: today,
          status: 'PRESENT',
          overtimeHours: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.attendance.status).toBe('PRESENT');
    });

    it('Generates monthly payroll and supports disbursement', async () => {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const genRes = await request(app)
        .post('/api/hr/payroll/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          month: currentMonth,
          year: currentYear,
          employeeId,
        });

      expect(genRes.status).toBe(200);
      expect(genRes.body.success).toBe(true);
      expect(Array.isArray(genRes.body.payrolls)).toBe(true);

      const targetPayroll = genRes.body.payrolls.find((p: any) => p.employeeId === employeeId);
      expect(targetPayroll).toBeDefined();
      expect(Number(targetPayroll.netPayable)).toBeGreaterThan(0);

      // Settle partial salary payment
      const payRes = await request(app)
        .post(`/api/hr/payroll/${targetPayroll.id}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paidAmount: 15000,
          paymentMethod: 'CASH',
          notes: 'Advance salary disbursement',
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.payroll.status).toBe('PARTIALLY_PAID');
      expect(Number(payRes.body.payroll.paidAmount)).toBe(15000);
    });
  });
});

