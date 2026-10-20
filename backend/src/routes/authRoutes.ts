import { Router } from 'express';
import { login, getProfile, getUsers, createUser, updateUser, changePassword } from '../controllers/authController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.post('/change-password', authenticate, changePassword);

// Admin-only user management
router.get('/users', authenticate, authorize([Role.ADMIN]), getUsers);
router.post('/users', authenticate, authorize([Role.ADMIN]), createUser);
router.put('/users/:id', authenticate, authorize([Role.ADMIN]), updateUser);

export default router;
