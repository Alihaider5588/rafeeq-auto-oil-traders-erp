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
router.post('/employees', authorize([Role.ADMIN], 'action:edit_employee'), createEmployee);
router.put('/employees/:id', authorize([Role.ADMIN], 'action:edit_employee'), updateEmployee);
router.delete('/employees/:id', authorize([Role.ADMIN], 'action:delete_employee'), deleteEmployee);

// Attendance (Admin & Operator can view & log)
router.get('/attendance', getAttendances);
router.post('/attendance', authorize([Role.ADMIN, Role.OPERATOR], 'action:edit_employee'), recordAttendance);
router.delete('/attendance/:id', authorize([Role.ADMIN], 'action:delete_employee'), deleteAttendance);

// Payroll (ADMIN or user with /employees permission)
router.get('/payroll', authorize([Role.ADMIN], '/employees'), getPayrolls);
router.post('/payroll/generate', authorize([Role.ADMIN], 'action:edit_employee'), generateMonthlyPayroll);
router.post('/payroll/:id/pay', authorize([Role.ADMIN], 'action:edit_employee'), settlePayrollPayment);

export default router;
