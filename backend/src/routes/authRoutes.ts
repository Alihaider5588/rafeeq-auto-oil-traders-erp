import { Router } from 'express';
import { login, getProfile, getUsers, createUser, updateUser, changePassword } from '../controllers/authController';
import { authenticate, authorize } from '../middlewares/auth';
import { authLimiter, passwordLimiter } from '../middlewares/rateLimiter';
import { Role } from '../types/enums';

const router = Router();

router.post('/login', authLimiter, login);
router.get('/profile', authenticate, getProfile);
router.post('/change-password', authenticate, passwordLimiter, changePassword);

// User management (Admin & Operator)
router.get('/users', authenticate, authorize([Role.ADMIN, Role.OPERATOR]), getUsers);
router.post('/users', authenticate, authorize([Role.ADMIN, Role.OPERATOR]), createUser);
router.put('/users/:id', authenticate, authorize([Role.ADMIN, Role.OPERATOR]), updateUser);

export default router;
