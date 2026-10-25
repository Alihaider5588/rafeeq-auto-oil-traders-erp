import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { Role } from '../types/enums';
import { Prisma } from '@prisma/client';
import { clearDashboardCache } from './reportController';

const expenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().default('CASH'),
  expenseDate: z.any().optional(),
  date: z.any().optional(),
  description: z.string().optional().nullable(),
});

export const getExpenses = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, startDate, endDate, page = '1', limit = '100' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ExpenseWhereInput = {};
    if (category && typeof category === 'string') where.category = category;
    if (startDate || endDate) {
      where.expenseDate = {
        ...(startDate ? { gte: new Date(startDate as string) } : {}),
        ...(endDate ? { lte: new Date(endDate as string) } : {}),
      };
    }

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    // Calculate total sum of expenses in range
    const aggregate = await prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    });

    // Provide dual compatibility: array directly or object with data
    res.json({
      success: true,
      data: expenses,
      expenses,
      totalAmount: Number(aggregate._sum.amount || 0),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve expenses' });
  }
};

export const getExpenseSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [aggregate, count, byCategory] = await Promise.all([
      prisma.expense.aggregate({
        _sum: { amount: true },
      }),
      prisma.expense.count(),
      prisma.expense.groupBy({
        by: ['category'],
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      totalExpense: Number(aggregate._sum.amount || 0),
      count,
      byCategory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve expense summary' });
  }
};

export const createExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = expenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten(), message: 'Validation failed' });
      return;
    }

    const { category, amount, paymentMethod, expenseDate, date, description } = parsed.data;

    let targetDate = new Date();
    if (expenseDate) {
      targetDate = new Date(expenseDate);
    } else if (date) {
      targetDate = new Date(date);
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        amount: new Prisma.Decimal(amount),
        paymentMethod: paymentMethod || 'CASH',
        expenseDate: targetDate,
        description: description?.trim() || null,
        recordedById: req.user?.id || 'admin',
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'EXPENSE_RECORDED',
      entityType: 'EXPENSE',
      entityId: expense.id,
      details: { category, amount },
      ipAddress: req.ip,
    });

    clearDashboardCache();
    res.status(201).json({ success: true, expense });
  } catch (error) {
    console.error('Failed to record expense:', error);
    res.status(500).json({ success: false, message: 'Failed to record expense' });
  }
};

export const deleteExpense = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    await prisma.expense.delete({ where: { id } });

    await logAudit({
      userId: req.user?.id,
      action: 'EXPENSE_DELETED',
      entityType: 'EXPENSE',
      entityId: id,
      details: { amount: Number(existing.amount), category: existing.category },
      ipAddress: req.ip,
    });

    clearDashboardCache();
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};
