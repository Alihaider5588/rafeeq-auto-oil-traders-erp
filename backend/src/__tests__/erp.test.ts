import request from 'supertest';
import app from '../server';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, MovementType, OrderStatus, PaymentMethod } from '../types/enums';

// Mock Prisma Client methods to verify logic without requiring external live database socket
jest.mock('../utils/prisma', () => {
  const mockDb: any = {
    users: [],
    products: [],
    suppliers: [],
    customers: [],
    purchases: [],
    sales: [],
    stockMovements: [],
    customerLedgers: [],
    supplierLedgers: [],
    payments: [],
    auditLogs: [],
    settings: [{
      id: 'default-setting',
      allowNegativeStock: false,
      requireOrderApproval: false,
      companyName: 'RAFFEEQUE OIL TRADERS',
    }],
  };

  return {
    __esModule: true,
    default: {
      user: {
        findFirst: jest.fn(async ({ where }) => {
          if (where.role) {
            return mockDb.users.find((u: any) => u.role === where.role) || null;
          }
          if (where.OR) {
            return mockDb.users.find((u: any) =>
              where.OR.some((cond: any) =>
                (cond.username && u.username === cond.username) ||
                (cond.phone && u.phone === cond.phone)
              )
            ) || null;
          }
          return null;
        }),
        findUnique: jest.fn(async ({ where }) => {
          return mockDb.users.find((u: any) => u.id === where.id) || null;
        }),
        findMany: jest.fn(async () => mockDb.users),
        create: jest.fn(async ({ data }) => {
          const user = { ...data, id: `user-${Date.now()}`, createdAt: new Date() };
          mockDb.users.push(user);
          return user;
        }),
        update: jest.fn(async ({ where, data }) => {
          const idx = mockDb.users.findIndex((u: any) => u.id === where.id);
          if (idx !== -1) {
            mockDb.users[idx] = { ...mockDb.users[idx], ...data };
            return mockDb.users[idx];
          }
          return null;
        }),
        count: jest.fn(async ({ where }) => {
          if (where?.role) {
            return mockDb.users.filter((u: any) => u.role === where.role).length;
          }
          return mockDb.users.length;
        }),
      },
      product: {
        findUnique: jest.fn(async ({ where }) => {
          if (where.id) return mockDb.products.find((p: any) => p.id === where.id) || null;
          if (where.sku) return mockDb.products.find((p: any) => p.sku === where.sku) || null;
          return null;
        }),
        findMany: jest.fn(async () => mockDb.products),
        count: jest.fn(async () => mockDb.products.length),
        update: jest.fn(async ({ where, data }) => {
          const prod = mockDb.products.find((p: any) => p.id === where.id);
          if (prod) {
            Object.assign(prod, data);
            return prod;
          }
          return null;
        }),
      },
      supplier: {
        findUnique: jest.fn(async ({ where }) => mockDb.suppliers.find((s: any) => s.id === where.id) || null),
        findMany: jest.fn(async () => mockDb.suppliers),
        update: jest.fn(async ({ where, data }) => {
          const sup = mockDb.suppliers.find((s: any) => s.id === where.id);
          if (sup) {
            Object.assign(sup, data);
            return sup;
          }
          return null;
        }),
      },
      customer: {
        findUnique: jest.fn(async ({ where }) => mockDb.customers.find((c: any) => c.id === where.id) || null),
        findMany: jest.fn(async () => mockDb.customers),
        update: jest.fn(async ({ where, data }) => {
          const cust = mockDb.customers.find((c: any) => c.id === where.id);
          if (cust) {
            Object.assign(cust, data);
            return cust;
          }
          return null;
        }),
      },
      purchase: {
        findUnique: jest.fn(async ({ where }) => mockDb.purchases.find((p: any) => p.invoiceNumber === where.invoiceNumber) || null),
        findMany: jest.fn(async () => mockDb.purchases),
        count: jest.fn(async () => mockDb.purchases.length),
      },
      sale: {
        findUnique: jest.fn(async ({ where }) => mockDb.sales.find((s: any) => s.id === where.id) || null),
        findMany: jest.fn(async () => mockDb.sales),
        count: jest.fn(async () => mockDb.sales.length),
        update: jest.fn(async ({ where, data }) => {
          const sale = mockDb.sales.find((s: any) => s.id === where.id);
          if (sale) {
            Object.assign(sale, data);
            return sale;
          }
          return null;
        }),
      },
      systemSetting: {
        findFirst: jest.fn(async () => mockDb.settings[0]),
      },
      auditLog: {
        create: jest.fn(async ({ data }) => {
          mockDb.auditLogs.push(data);
          return data;
        }),
        findMany: jest.fn(async () => mockDb.auditLogs),
        count: jest.fn(async () => mockDb.auditLogs.length),
      },
      $transaction: jest.fn(async (callback) => {
        return callback({
          purchase: {
            create: jest.fn(async ({ data }) => {
              const p = { ...data, id: `pur-${Date.now()}` };
              mockDb.purchases.push(p);
              return p;
            }),
          },
          sale: {
            create: jest.fn(async ({ data }) => {
              const s = { ...data, id: `sale-${Date.now()}` };
              mockDb.sales.push(s);
              return s;
            }),
            update: jest.fn(async ({ where, data }) => {
              const s = mockDb.sales.find((x: any) => x.id === where.id);
              if (s) Object.assign(s, data);
              return s;
            }),
          },
          product: {
            findUnique: jest.fn(async ({ where }) => mockDb.products.find((p: any) => p.id === where.id) || null),
            update: jest.fn(async ({ where, data }) => {
              const prod = mockDb.products.find((p: any) => p.id === where.id);
              if (prod) Object.assign(prod, data);
              return prod;
            }),
          },
          supplier: {
            findUnique: jest.fn(async ({ where }) => mockDb.suppliers.find((s: any) => s.id === where.id) || null),
            update: jest.fn(async ({ where, data }) => {
              const sup = mockDb.suppliers.find((s: any) => s.id === where.id);
              if (sup) Object.assign(sup, data);
              return sup;
            }),
          },
          customer: {
            findUnique: jest.fn(async ({ where }) => mockDb.customers.find((c: any) => c.id === where.id) || null),
            update: jest.fn(async ({ where, data }) => {
              const cust = mockDb.customers.find((c: any) => c.id === where.id);
              if (cust) Object.assign(cust, data);
              return cust;
            }),
          },
          stockMovement: {
            create: jest.fn(async ({ data }) => {
              mockDb.stockMovements.push(data);
              return data;
            }),
          },
          supplierLedger: {
            create: jest.fn(async ({ data }) => {
              mockDb.supplierLedgers.push(data);
              return data;
            }),
          },
          customerLedger: {
            create: jest.fn(async ({ data }) => {
              mockDb.customerLedgers.push(data);
              return data;
            }),
          },
          payment: {
            create: jest.fn(async ({ data }) => {
              mockDb.payments.push(data);
              return data;
            }),
          },
        });
      }),
      _mockDb: mockDb,
    },
  };
});

describe('RAFEEQUE OIL TRADERS - SYSTEM VERIFICATION & AUDIT SUITE', () => {
  let adminToken: string;
  let operatorToken: string;
  let cashierToken: string;
  let salesmanToken: string;
  const mockDb = (prisma as any)._mockDb;

  beforeAll(async () => {
    // Populate base mock test users
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('Admin@123', salt);

    const adminUser = {
      id: 'admin-uuid-001',
      username: 'admin',
      fullName: 'Muhammad Rafeeque',
      passwordHash: passHash,
      role: Role.ADMIN,
      isActive: true,
    };
    const operatorUser = {
      id: 'operator-uuid-002',
      username: 'operator',
      fullName: 'Kamran Akmal',
      passwordHash: passHash,
      role: Role.OPERATOR,
      isActive: true,
    };
    const cashierUser = {
      id: 'cashier-uuid-003',
      username: 'cashier',
      fullName: 'Tariq Mehmood',
      passwordHash: passHash,
      role: Role.CASHIER,
      isActive: true,
    };
    const salesmanUser = {
      id: 'salesman-uuid-004',
      username: 'salesman',
      fullName: 'Bilal Khan',
      passwordHash: passHash,
      role: Role.SALESMAN,
      isActive: true,
    };

    mockDb.users.push(adminUser, operatorUser, cashierUser, salesmanUser);

    const secret = process.env.JWT_SECRET || 'rafeeque_super_secret_jwt_key_2026';
    adminToken = jwt.sign({ id: adminUser.id, username: adminUser.username, role: Role.ADMIN }, secret);
    operatorToken = jwt.sign({ id: operatorUser.id, username: operatorUser.username, role: Role.OPERATOR }, secret);
    cashierToken = jwt.sign({ id: cashierUser.id, username: cashierUser.username, role: Role.CASHIER }, secret);
    salesmanToken = jwt.sign({ id: salesmanUser.id, username: salesmanUser.username, role: Role.SALESMAN }, secret);

    // Initial Test Inventory & Accounts
    mockDb.products.push({
      id: 'prod-001',
      name: 'Total Quartz 9000 5W-40',
      sku: 'TOT-9000-4L',
      purchasePrice: 6200,
      salePrice: 7500,
      currentStock: 10,
      minimumStockLevel: 5,
      isActive: true,
    });

    mockDb.suppliers.push({
      id: 'sup-001',
      companyName: 'Shell Distributor',
      currentPayable: 100000,
    });

    mockDb.customers.push({
      id: 'cust-001',
      shopName: 'Bismillah Autos',
      currentReceivable: 25000,
    });
  });

  // TEST 1: Healthcheck
  test('1. Backend /health endpoint returns online status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
  });

  // TEST 2: Authentication & Password Verification
  test('2. Login succeeds with correct credentials and returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: 'Admin@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe(Role.ADMIN);
  });

  test('3. Login fails with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // TEST 4: Enforce ONLY ONE Admin Account
  test('4. System strictly blocks creating a SECOND Admin account', async () => {
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'second_admin',
        fullName: 'Second Admin Attempt',
        password: 'Password@123',
        role: Role.ADMIN,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Only ONE Admin account is permitted');
  });

  // TEST 5: Role-based permissions enforcement
  test('5. Non-admin users cannot access admin-only endpoints', async () => {
    const res = await request(app)
      .post('/api/auth/users')
      .set('Authorization', `Bearer ${salesmanToken}`)
      .send({
        username: 'test_user',
        fullName: 'Test User',
        password: 'Password@123',
        role: Role.SALESMAN,
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // TEST 6: Complete Workflow - Purchase Maal Inward increases stock & updates supplier ledger
  test('6. Inward Purchase increases stock automatically and calculates supplier payable', async () => {
    const initialStock = mockDb.products[0].currentStock; // 10
    const initialPayable = mockDb.suppliers[0].currentPayable; // 100000

    const purchasePayload = {
      supplierId: 'sup-001',
      invoiceNumber: 'TEST-PUR-001',
      items: [{ productId: 'prod-001', quantity: 20, unitCost: 6200 }],
      discount: 0,
      tax: 0,
      paidAmount: 50000,
      paymentMethod: PaymentMethod.CASH,
    };

    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send(purchasePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify stock increased by 20: 10 + 20 = 30
    expect(Number(mockDb.products[0].currentStock)).toBe(initialStock + 20);

    // Verify remaining payable was added to supplier ledger:
    // Total cost = 124,000, Paid = 50,000, Remaining = 74,000
    // New payable = 100,000 + 74,000 = 174,000
    expect(Number(mockDb.suppliers[0].currentPayable)).toBe(initialPayable + 74000);
  });

  // TEST 7: Complete Workflow - Sale reduces stock & updates customer receivable
  test('7. Sale decreases stock automatically and updates customer receivable ledger', async () => {
    const currentStock = Number(mockDb.products[0].currentStock); // 30
    const currentReceivable = Number(mockDb.customers[0].currentReceivable); // 25000

    const salePayload = {
      customerId: 'cust-001',
      items: [{ productId: 'prod-001', quantity: 5, unitPrice: 7500 }],
      discount: 500,
      receivedAmount: 20000,
      paymentMethod: PaymentMethod.CASH,
    };

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${salesmanToken}`)
      .send(salePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Total = 37,500 - 500 = 37,000 net bill. Received = 20,000. Balance remaining = 17,000.
    // Stock reduced: 30 - 5 = 25
    expect(Number(mockDb.products[0].currentStock)).toBe(currentStock - 5);

    // Customer receivable increases by remaining unpaid amount (17,000)
    expect(Number(mockDb.customers[0].currentReceivable)).toBe(currentReceivable + 17000);

    // Profit calculation:
    // Revenue = 37,000. Cost = 5 * 6200 = 31,000. Gross profit = 6,000.
    expect(Number(res.body.sale.grossProfit)).toBe(6000);
  });

  // TEST 8: Prevent Negative Stock Selling
  test('8. System prevents selling more than available stock when negative stock is disabled', async () => {
    const excessiveSalePayload = {
      customerId: 'cust-001',
      items: [{ productId: 'prod-001', quantity: 999, unitPrice: 7500 }],
      receivedAmount: 0,
    };

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send(excessiveSalePayload);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Insufficient stock');
  });

  // TEST 9: Customer Ledger Recovery Payment
  test('9. Recording customer payment decrements receivable and creates ledger credit entry', async () => {
    const currentReceivable = mockDb.customers[0].currentReceivable;

    const paymentPayload = {
      customerId: 'cust-001',
      amount: 10000,
      paymentMethod: PaymentMethod.CASH,
      reference: 'REC-TEST-999',
      notes: 'Customer cleared partial udhar balance',
    };

    const res = await request(app)
      .post('/api/ledgers/payment')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send(paymentPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Number(mockDb.customers[0].currentReceivable)).toBe(currentReceivable - 10000);
  });
});
