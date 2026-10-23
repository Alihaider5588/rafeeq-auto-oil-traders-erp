import { Router } from 'express';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendances,
  recordAttendance,
  deleteAttendance,
  getPayrolls,
  generateMonthlyPayroll,
  settlePayrollPayment,
} from '../controllers/employeeController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

// Employees (Admin & Operator can view, Admin can manage)
router.get('/employees', getEmployees);
router.post('/employees', authorize([Role.ADMIN]), createEmployee);
router.put('/employees/:id', authorize([Role.ADMIN]), updateEmployee);
router.delete('/employees/:id', authorize([Role.ADMIN]), deleteEmployee);

// Attendance (Admin & Operator can view & log)
router.get('/attendance', getAttendances);
router.post('/attendance', authorize([Role.ADMIN, Role.OPERATOR]), recordAttendance);
router.delete('/attendance/:id', authorize([Role.ADMIN]), deleteAttendance);

// Payroll (Strictly ADMIN only)
router.get('/payroll', authorize([Role.ADMIN]), getPayrolls);
router.post('/payroll/generate', authorize([Role.ADMIN]), generateMonthlyPayroll);
router.post('/payroll/:id/pay', authorize([Role.ADMIN]), settlePayrollPayment);

export default router;
