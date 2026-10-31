import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { Prisma } from '@prisma/client';

const vehicleSchema = z.object({
  vehicleNumber: z.string().min(2),
  driverName: z.string().min(2),
  driverPhone: z.string().min(6),
  supplyManName: z.string().min(2),
  notes: z.string().optional(),
});

const routeScheduleSchema = z.object({
  vehicleId: z.string().min(1),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  routeName: z.string().min(2),
  targetAreas: z.string().optional(),
  driverName: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true).optional(),
});

const deliveryItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  isAdditional: z.boolean().default(false).optional(),
  notes: z.string().optional(),
});

const deliverySchema = z.object({
  vehicleId: z.string().min(1),
  routeArea: z.string().min(2),
  salesmanId: z.string().min(1).optional().nullable(),
  totalCustomers: z.number().int().min(0).default(0),
  items: z.array(deliveryItemSchema).min(1),
  paymentReceived: z.number().min(0).default(0),
  creditAmount: z.number().min(0).default(0),
  returnedGoods: z.number().min(0).default(0),
  notes: z.string().optional(),
});

// VEHICLES
export const getVehicles = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        routeSchedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { vehicleNumber: 'asc' },
    });
    res.json({ success: true, vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve vehicles' });
  }
};

export const createVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = vehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const vehicle = await prisma.vehicle.create({
      data,
      include: { routeSchedules: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'VEHICLE_CREATED',
      entityType: 'VEHICLE',
      entityId: vehicle.id,
      details: { vehicleNumber: vehicle.vehicleNumber },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, vehicle });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create vehicle' });
  }
};

export const updateVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = vehicleSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: parsed.data,
      include: { routeSchedules: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'VEHICLE_UPDATED',
      entityType: 'VEHICLE',
      entityId: updated.id,
      details: { vehicleNumber: updated.vehicleNumber },
      ipAddress: req.ip,
    });

    res.json({ success: true, vehicle: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update vehicle' });
  }
};

export const deleteVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.vehicle.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'VEHICLE_DELETED',
      entityType: 'VEHICLE',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete vehicle' });
  }
};

// RECURRING ROUTE SCHEDULES (E.G. MONDAY: OKARA, TUESDAY: RENALA)
export const getRouteSchedules = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { vehicleId, dayOfWeek } = req.query;
    const where: Prisma.DeliveryRouteScheduleWhereInput = {};
    if (vehicleId) where.vehicleId = vehicleId as string;
    if (dayOfWeek) where.dayOfWeek = dayOfWeek as string;

    const schedules = await prisma.deliveryRouteSchedule.findMany({
      where,
      include: { vehicle: true },
      orderBy: [{ vehicleId: 'asc' }, { dayOfWeek: 'asc' }],
    });

    res.json({ success: true, schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve route schedules' });
  }
};

export const upsertRouteSchedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = routeScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const { vehicleId, dayOfWeek, routeName, targetAreas, driverName, notes, isActive = true } = parsed.data;

    const schedule = await prisma.deliveryRouteSchedule.upsert({
      where: {
        vehicleId_dayOfWeek: {
          vehicleId,
          dayOfWeek,
        },
      },
      update: {
        routeName,
        targetAreas,
        driverName,
        notes,
        isActive,
      },
      create: {
        vehicleId,
        dayOfWeek,
        routeName,
        targetAreas,
        driverName,
        notes,
        isActive,
      },
      include: { vehicle: true },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'ROUTE_SCHEDULE_SAVED',
      entityType: 'ROUTE_SCHEDULE',
      entityId: schedule.id,
      details: { vehicleId, dayOfWeek, routeName },
      ipAddress: req.ip,
    });

    res.json({ success: true, schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to save route schedule' });
  }
};

export const deleteRouteSchedule = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.deliveryRouteSchedule.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'ROUTE_SCHEDULE_DELETED',
      entityType: 'ROUTE_SCHEDULE',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Route schedule deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete route schedule' });
  }
};

// DELIVERIES & DAILY VAN DISPATCH
export const getDeliveries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { date, vehicleId } = req.query;
    const where: Prisma.DailyDeliveryWhereInput = {};

    if (vehicleId) where.vehicleId = vehicleId as string;
    if (date) {
      const d = new Date(date as string);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    const deliveries = await prisma.dailyDelivery.findMany({
      where,
      include: {
        vehicle: true,
        salesman: { select: { id: true, fullName: true } },
        items: { include: { product: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ success: true, deliveries });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve deliveries' });
  }
};

export const createDelivery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = deliverySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    let totalDelivered = 0;
    data.items.forEach((it) => {
      totalDelivered += it.quantity * it.unitPrice;
    });

    const netSales = totalDelivered - data.returnedGoods;
    const deliveryNumber = `DEL-${Date.now().toString().slice(-8)}`;

    const delivery = await prisma.dailyDelivery.create({
      data: {
        deliveryNumber,
        vehicleId: data.vehicleId,
        routeArea: data.routeArea,
        salesmanId: data.salesmanId,
        totalCustomers: data.totalCustomers,
        totalDelivered: new Prisma.Decimal(totalDelivered),
        paymentReceived: new Prisma.Decimal(data.paymentReceived),
        creditAmount: new Prisma.Decimal(data.creditAmount),
        returnedGoods: new Prisma.Decimal(data.returnedGoods),
        netSales: new Prisma.Decimal(netSales),
        notes: data.notes,
        items: {
          create: data.items.map((it) => ({
            productId: it.productId,
            quantity: new Prisma.Decimal(it.quantity),
            unitPrice: new Prisma.Decimal(it.unitPrice),
            totalPrice: new Prisma.Decimal(it.quantity * it.unitPrice),
            isAdditional: it.isAdditional ?? false,
            notes: it.notes,
          })),
        },
      },
      include: { vehicle: true, items: { include: { product: true } } },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'DELIVERY_DISPATCHED',
      entityType: 'DAILY_DELIVERY',
      entityId: delivery.id,
      details: { deliveryNumber, netSales, itemsCount: data.items.length },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, delivery });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to record delivery' });
  }
};

export const deleteDelivery = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.dailyDelivery.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'DELIVERY_DELETED',
      entityType: 'DAILY_DELIVERY',
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Delivery record deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete delivery' });
  }
};

// ACTIVE VAN FOR LOGGED IN SALESMAN (Live Route Tracking in POS)
export const getActiveVanForSalesman = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const where: Prisma.DailyDeliveryWhereInput = {
      date: { gte: startOfDay, lte: endOfDay }
    };
    if (req.user?.role === 'SALESMAN') {
      where.salesmanId = userId;
    }

    const delivery = await prisma.dailyDelivery.findFirst({
      where,
      include: {
        vehicle: true,
        salesman: { select: { id: true, fullName: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                salePrice: true,
                purchasePrice: true,
                conversionFactor: true,
                unit: { select: { name: true, symbol: true } },
                primaryUnit: { select: { name: true, symbol: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!delivery) {
      res.json({ success: true, activeVan: null });
      return;
    }

    // Find sales created by this salesman today since delivery was dispatched
    const salesToday = await prisma.sale.findMany({
      where: {
        salesmanId: delivery.salesmanId || undefined,
        createdAt: { gte: delivery.createdAt }
      },
      include: {
        items: true
      }
    });

    const soldQtyMap: Record<string, number> = {};
    let totalCash = 0;
    let totalCredit = 0;
    let totalSales = 0;

    for (const sale of salesToday) {
      totalSales += Number(sale.netAmount || 0);
      totalCash += Number(sale.receivedAmount || 0);
      totalCredit += Number(sale.remainingBalance || 0);

      for (const item of sale.items) {
        const qty = Number(item.quantity || 0);
        soldQtyMap[item.productId] = (soldQtyMap[item.productId] || 0) + qty;
      }
    }

    const itemsSummary = delivery.items.map((it) => {
      const loaded = Number(it.quantity || 0);
      const sold = soldQtyMap[it.productId] || 0;
      const remaining = Math.max(0, loaded - sold);
      return {
        id: it.id,
        productId: it.productId,
        product: it.product,
        loadedQty: loaded,
        soldQty: sold,
        remainingInVan: remaining,
        unitPrice: Number(it.unitPrice || 0),
        totalPrice: Number(it.totalPrice || 0)
      };
    });

    res.json({
      success: true,
      activeVan: {
        deliveryId: delivery.id,
        deliveryNumber: delivery.deliveryNumber,
        routeArea: delivery.routeArea,
        vehicle: delivery.vehicle,
        salesman: delivery.salesman,
        createdAt: delivery.createdAt,
        items: itemsSummary,
        financials: {
          totalLoadedValue: Number(delivery.totalDelivered || 0),
          totalSales,
          totalCash,
          totalCredit,
          salesCount: salesToday.length
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch active van' });
  }
};

// RECONCILIATION & RETURN HISAB REPORT FOR COMPLETED OR ACTIVE ROUTE
export const getDeliveryReconciliation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const delivery = await prisma.dailyDelivery.findUnique({
      where: { id },
      include: {
        vehicle: true,
        salesman: { select: { id: true, fullName: true, username: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                salePrice: true,
                purchasePrice: true,
                conversionFactor: true,
                unit: { select: { name: true, symbol: true } },
                primaryUnit: { select: { name: true, symbol: true } }
              }
            }
          }
        }
      }
    });

    if (!delivery) {
      res.status(404).json({ success: false, message: 'Delivery dispatch not found' });
      return;
    }

    const deliveryDate = new Date(delivery.date);
    const startOfDelivery = new Date(delivery.createdAt);
    const endOfDelivery = new Date(deliveryDate.setHours(23, 59, 59, 999));

    const sales = await prisma.sale.findMany({
      where: {
        salesmanId: delivery.salesmanId || undefined,
        createdAt: { gte: startOfDelivery, lte: endOfDelivery }
      },
      include: {
        customer: { select: { shopName: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const productSalesMap: Record<string, { soldQty: number; totalAmount: number }> = {};
    let totalCashCollected = 0;
    let totalCreditGiven = 0;
    let totalSalesAmount = 0;

    for (const s of sales) {
      totalSalesAmount += Number(s.netAmount || 0);
      totalCashCollected += Number(s.receivedAmount || 0);
      totalCreditGiven += Number(s.remainingBalance || 0);

      for (const item of s.items) {
        const qty = Number(item.quantity || 0);
        const amt = Number(item.totalPrice || 0);
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { soldQty: 0, totalAmount: 0 };
        }
        productSalesMap[item.productId].soldQty += qty;
        productSalesMap[item.productId].totalAmount += amt;
      }
    }

    const itemsReconciliation = delivery.items.map((it) => {
      const loaded = Number(it.quantity || 0);
      const sold = productSalesMap[it.productId]?.soldQty || 0;
      const returned = Math.max(0, loaded - sold);
      const unitRate = Number(it.unitPrice || 0);
      return {
        productId: it.productId,
        productName: it.product.name,
        sku: it.product.sku,
        unitSymbol: it.product.unit?.symbol || 'Pcs',
        loadedQty: loaded,
        loadedRate: unitRate,
        loadedValue: loaded * unitRate,
        soldQty: sold,
        returnedQty: returned,
        returnedValue: returned * unitRate
      };
    });

    const totalLoadedValue = itemsReconciliation.reduce((sum, it) => sum + it.loadedValue, 0);
    const totalReturnedValue = itemsReconciliation.reduce((sum, it) => sum + it.returnedValue, 0);

    res.json({
      success: true,
      reconciliation: {
        deliveryId: delivery.id,
        deliveryNumber: delivery.deliveryNumber,
        date: delivery.date,
        createdAt: delivery.createdAt,
        vehicleNumber: delivery.vehicle.vehicleNumber,
        driverName: delivery.vehicle.driverName,
        routeArea: delivery.routeArea,
        salesmanName: delivery.salesman?.fullName || 'General Route Sales',
        totalInvoicesCreated: sales.length,
        items: itemsReconciliation,
        financials: {
          totalLoadedValue,
          totalSalesAmount,
          totalCashCollected,
          totalCreditGiven,
          totalReturnedValue
        },
        salesInvoices: sales.map(s => ({
          invoiceNumber: s.invoiceNumber,
          customerName: s.customer?.shopName || 'Walk-in',
          netAmount: Number(s.netAmount),
          receivedCash: Number(s.receivedAmount),
          creditAmount: Number(s.remainingBalance),
          time: s.createdAt
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to generate reconciliation' });
  }
};
