import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { Prisma } from '@prisma/client';

const employeeSchema = z.object({
  employeeCode: z.string().min(2, 'Employee code is required'),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  designation: z.string().min(2, 'Designation is required'),
  joiningDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).default('ACTIVE'),
  salaryType: z.enum(['MONTHLY', 'DAILY']).default('MONTHLY'),
  basicSalary: z.number().min(0, 'Basic salary must be positive'),
  allowances: z.number().min(0).default(0),
  workSchedule: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const attendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  date: z.string().min(1, 'Attendance date is required'),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'WEEKLY_OFF']),
  overtimeHours: z.number().min(0).default(0),
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const generatePayrollSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
  employeeId: z.string().optional(), // If omitted, generates for all active employees
});

const settlePayrollSchema = z.object({
  paidAmount: z.number().positive('Paid amount must be positive'),
  paymentMethod: z.string().default('CASH'),
  notes: z.string().optional().nullable(),
});

// --- EMPLOYEES ---
export const getEmployees = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { fullName: 'asc' },
      include: {
        _count: {
          select: { attendances: true, payrolls: true }
        }
      }
    });
    res.json({ success: true, employees });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve employees' });
  }
};

export const createEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = employeeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const { employeeCode, fullName, phone, designation, joiningDate, status, salaryType, basicSalary, allowances, workSchedule, notes } = parsed.data;

    const existing = await prisma.employee.findFirst({
      where: { OR: [{ employeeCode }, { phone }] }
    });
    if (existing) {
      res.status(400).json({ success: false, message: 'Employee Code or Phone is already registered.' });
      return;
    }

    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        fullName,
        phone,
        designation,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        status,
        salaryType,
        basicSalary: new Prisma.Decimal(basicSalary),
        allowances: new Prisma.Decimal(allowances),
        workSchedule: workSchedule || '6 Days / Week (9am - 8pm)',
        notes: notes || null,
      }
    });

    await logAudit({
      userId: req.user?.id,
      action: 'EMPLOYEE_CREATED',
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      details: { employeeCode, fullName, designation },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create employee' });
  }
};

export const updateEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updateData: any = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.phone) updateData.phone = data.phone;
    if (data.designation) updateData.designation = data.designation;
    if (data.status) updateData.status = data.status;
    if (data.salaryType) updateData.salaryType = data.salaryType;
    if (data.basicSalary !== undefined) updateData.basicSalary = new Prisma.Decimal(data.basicSalary);
    if (data.allowances !== undefined) updateData.allowances = new Prisma.Decimal(data.allowances);
    if (data.workSchedule !== undefined) updateData.workSchedule = data.workSchedule;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData
    });

    await logAudit({
      userId: req.user?.id,
      action: 'EMPLOYEE_UPDATED',
      entityType: 'EMPLOYEE',
      entityId: id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
    });

    res.json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update employee' });
  }
};

export const deleteEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: { attendances: true, payrolls: true }
        }
      }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Employee not found' });
      return;
    }

    // Cascade delete employee records safely
    await prisma.employee.delete({
      where: { id }
    });

    await logAudit({
      userId: req.user?.id,
      action: 'EMPLOYEE_DELETED',
      entityType: 'EMPLOYEE',
      entityId: id,
      details: {
        employeeCode: existing.employeeCode,
        fullName: existing.fullName,
        designation: existing.designation,
      },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Employee "${existing.fullName}" removed successfully.` });
  } catch (error) {
    console.error('deleteEmployee error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete employee' });
  }
};

export const deleteAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.attendance.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Attendance record not found' });
      return;
    }

    await prisma.attendance.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Attendance record removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete attendance record' });
  }
};

// --- ATTENDANCE ---
export const getAttendances = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { employeeId, date, month, year } = req.query;
    const where: Prisma.AttendanceWhereInput = {};

    if (employeeId && typeof employeeId === 'string') {
      where.employeeId = employeeId;
    }

    if (date && typeof date === 'string') {
      const d = new Date(date);
      const startOfDay = new Date(d.setHours(0, 0, 0, 0));
      const endOfDay = new Date(d.setHours(23, 59, 59, 999));
      where.date = { gte: startOfDay, lte: endOfDay };
    } else if (month && year) {
      const m = parseInt(month as string, 10);
      const y = parseInt(year as string, 10);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        employee: { select: { id: true, employeeCode: true, fullName: true, designation: true } }
      },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, attendances });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve attendance records' });
  }
};

export const recordAttendance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = attendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const { employeeId, date, status, overtimeHours, checkInTime, checkOutTime, notes } = parsed.data;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(12, 0, 0, 0); // Normalized to noon to avoid timezone shift

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate
        }
      },
      update: {
        status,
        overtimeHours: new Prisma.Decimal(overtimeHours),
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        notes: notes || null,
        recordedById: req.user?.id,
      },
      create: {
        employeeId,
        date: attendanceDate,
        status,
        overtimeHours: new Prisma.Decimal(overtimeHours),
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        notes: notes || null,
        recordedById: req.user?.id,
      }
    });

    res.json({ success: true, attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record attendance' });
  }
};

// --- PAYROLL ---
export const getPayrolls = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { month, year, employeeId } = req.query;
    const where: Prisma.PayrollWhereInput = {};

    if (month) where.month = parseInt(month as string, 10);
    if (year) where.year = parseInt(year as string, 10);
    if (employeeId && typeof employeeId === 'string') where.employeeId = employeeId;

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    res.json({ success: true, payrolls });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve payrolls' });
  }
};

export const generateMonthlyPayroll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = generatePayrollSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const { month, year, employeeId } = parsed.data;

    // Get active employees to calculate for
    const employeeQuery: Prisma.EmployeeWhereInput = { status: 'ACTIVE' };
    if (employeeId) employeeQuery.id = employeeId;

    const employees = await prisma.employee.findMany({ where: employeeQuery });
    if (employees.length === 0) {
      res.status(400).json({ success: false, message: 'No active employees found to generate payroll for.' });
      return;
    }

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    const results: any[] = [];

    for (const emp of employees) {
      // Find all attendances for employee in this month
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: startOfMonth, lte: endOfMonth }
        }
      });

      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let paidLeaveDays = 0;
      let weeklyOffDays = 0;
      let totalOvertimeHours = 0;

      for (const att of attendances) {
        if (att.status === 'PRESENT') presentDays += 1;
        else if (att.status === 'ABSENT') absentDays += 1;
        else if (att.status === 'HALF_DAY') halfDays += 1;
        else if (att.status === 'LEAVE') paidLeaveDays += 1;
        else if (att.status === 'WEEKLY_OFF') weeklyOffDays += 1;

        totalOvertimeHours += Number(att.overtimeHours || 0);
      }

      const basicSalaryNum = Number(emp.basicSalary);
      const allowancesNum = Number(emp.allowances);
      let calculatedSalary = 0;

      if (emp.salaryType === 'DAILY') {
        // Daily rate * (Present + PaidLeave + Half*0.5)
        const effectiveDays = presentDays + paidLeaveDays + (halfDays * 0.5);
        calculatedSalary = basicSalaryNum * effectiveDays;
      } else {
        // Monthly Salary: Deduct absent days and half-days
        const workingDaysBase = 30; // standard commercial calendar base
        const dailyRate = basicSalaryNum / workingDaysBase;
        const deductionsForAbsence = (absentDays * dailyRate) + (halfDays * (dailyRate * 0.5));
        calculatedSalary = Math.max(0, basicSalaryNum - deductionsForAbsence);
      }

      // Overtime rate: approx 1.5x hourly wage assuming 10 hour shift
      const hourlyWage = basicSalaryNum / (30 * 10);
      const overtimeAmount = totalOvertimeHours * hourlyWage * 1.5;

      const netPayable = Math.round(calculatedSalary + allowancesNum + overtimeAmount);
      const payrollNumber = `PAY-${year}-${String(month).padStart(2, '0')}-${emp.employeeCode}`;

      const payroll = await prisma.payroll.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month,
            year
          }
        },
        update: {
          basicSalary: emp.basicSalary,
          presentDays: new Prisma.Decimal(presentDays),
          absentDays: new Prisma.Decimal(absentDays),
          halfDays: new Prisma.Decimal(halfDays),
          paidLeaveDays: new Prisma.Decimal(paidLeaveDays),
          overtimeAmount: new Prisma.Decimal(Math.round(overtimeAmount)),
          allowances: emp.allowances,
          netPayable: new Prisma.Decimal(netPayable),
          balanceDue: new Prisma.Decimal(netPayable),
        },
        create: {
          payrollNumber,
          employeeId: emp.id,
          month,
          year,
          basicSalary: emp.basicSalary,
          presentDays: new Prisma.Decimal(presentDays),
          absentDays: new Prisma.Decimal(absentDays),
          halfDays: new Prisma.Decimal(halfDays),
          paidLeaveDays: new Prisma.Decimal(paidLeaveDays),
          overtimeAmount: new Prisma.Decimal(Math.round(overtimeAmount)),
          allowances: emp.allowances,
          netPayable: new Prisma.Decimal(netPayable),
          balanceDue: new Prisma.Decimal(netPayable),
          createdById: req.user?.id,
        }
      });

      results.push(payroll);
    }

    await logAudit({
      userId: req.user?.id,
      action: 'PAYROLL_GENERATED',
      entityType: 'PAYROLL',
      details: { month, year, totalEmployees: results.length },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Generated payroll for ${results.length} employees for ${month}/${year}`,
      payrolls: results
    });
  } catch (error) {
    console.error('Payroll generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate monthly payroll' });
  }
};

export const settlePayrollPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = settlePayrollSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const { paidAmount, paymentMethod, notes } = parsed.data;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payroll record not found' });
      return;
    }

    const currentPaid = Number(payroll.paidAmount);
    const netPayable = Number(payroll.netPayable);
    const newPaidTotal = currentPaid + paidAmount;
    const remainingBalance = Math.max(0, netPayable - newPaidTotal);

    let status = 'PARTIALLY_PAID';
    if (remainingBalance === 0) status = 'PAID';

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        paidAmount: new Prisma.Decimal(newPaidTotal),
        balanceDue: new Prisma.Decimal(remainingBalance),
        status,
        paymentMethod,
        paymentDate: new Date(),
        notes: notes ? `${payroll.notes || ''} [Paid Rs. ${paidAmount}]: ${notes}`.trim() : payroll.notes
      }
    });

    // Also automatically create an Expense entry under "Salaries" so it syncs with cashbook
    await prisma.expense.create({
      data: {
        category: 'Staff Salaries',
        amount: new Prisma.Decimal(paidAmount),
        paymentMethod,
        expenseDate: new Date(),
        description: `Salary disbursement for ${payroll.employee.fullName} (${payroll.payrollNumber})`,
        recordedById: req.user!.id,
      }
    });

    await logAudit({
      userId: req.user?.id,
      action: 'PAYROLL_SETTLED',
      entityType: 'PAYROLL',
      entityId: id,
      details: {
        employee: payroll.employee.fullName,
        disbursed: paidAmount,
        status
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `Disbursed Rs. ${paidAmount} to ${payroll.employee.fullName}`,
      payroll: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to settle payroll disbursement' });
  }
};
