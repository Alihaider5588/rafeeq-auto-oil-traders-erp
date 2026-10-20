import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { Role } from '../types/enums';

const loginSchema = z.object({
  identifier: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
});

const createUserSchema = z.object({
  username: z.string().min(3),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  permissions: z.array(z.string()).optional(),
});

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten() });
      return;
    }

    const rawId = parseResult.data.identifier || parseResult.data.username || (req.body as any).identifier || (req.body as any).username;
    if (!rawId) {
      res.status(400).json({ success: false, message: 'Username or phone is required' });
      return;
    }
    const identifier = String(rawId).trim();
    const { password } = parseResult.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { phone: identifier }],
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid username/phone or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, message: 'Account has been disabled. Please contact Admin.' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ success: false, message: 'Invalid username/phone or password' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'rafeeque_super_secret_jwt_key_2026';
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      secret,
      { expiresIn: '7d' }
    );

    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      details: { username: user.username, role: user.role },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        permissions: (user as any).permissions ? JSON.parse((user as any).permissions) : null,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    const parsedUser = user ? {
      ...user,
      permissions: (user as any).permissions ? JSON.parse((user as any).permissions) : null,
    } : null;

    res.json({ success: true, user: parsedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile' });
  }
};

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsedUsers = users.map(u => ({
      ...u,
      permissions: (u as any).permissions ? JSON.parse((u as any).permissions) : null,
    }));

    res.json({ success: true, users: parsedUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve users' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten() });
      return;
    }

    const { username, fullName, phone, password, role, permissions } = parseResult.data;

    // RULE: Only ONE Admin account is allowed
    if (role === Role.ADMIN) {
      const existingAdmin = await prisma.user.findFirst({
        where: { role: Role.ADMIN },
      });
      if (existingAdmin) {
        res.status(400).json({
          success: false,
          message: 'Only ONE Admin account is permitted in the system.',
        });
        return;
      }
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, ...(phone ? [{ phone }] : [])],
      },
    });

    if (existingUser) {
      res.status(400).json({ success: false, message: 'Username or phone number is already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        fullName,
        phone,
        passwordHash,
        role,
        permissions: permissions ? JSON.stringify(permissions) : null,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: newUser.id,
      details: { username: newUser.username, role: newUser.role },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      user: {
        ...newUser,
        permissions: (newUser as any).permissions ? JSON.parse((newUser as any).permissions) : null,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fullName, phone, role, isActive, password, permissions } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (role === Role.ADMIN && existing.role !== Role.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
      if (adminCount >= 1) {
        res.status(400).json({ success: false, message: 'Only ONE Admin account is permitted.' });
        return;
      }
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (permissions !== undefined) {
      updateData.permissions = permissions ? JSON.stringify(permissions) : null;
    }
    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    await logAudit({
      userId: req.user?.id,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      user: {
        ...updatedUser,
        permissions: (updatedUser as any).permissions ? JSON.parse((updatedUser as any).permissions) : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword, targetUserId } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    // Determine target user
    const userIdToUpdate = (req.user?.role === Role.ADMIN && targetUserId) ? targetUserId : req.user?.id;

    if (!userIdToUpdate) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userIdToUpdate } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // If a non-admin changes their own password, verify current password
    if (req.user?.role !== Role.ADMIN || userIdToUpdate === req.user.id) {
      if (!currentPassword) {
        res.status(400).json({ success: false, message: 'Current password is required.' });
        return;
      }
      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match) {
        res.status(400).json({ success: false, message: 'Current password does not match.' });
        return;
      }
    }

    const newHash = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: userIdToUpdate },
      data: { passwordHash: newHash }
    });

    await logAudit({
      userId: req.user?.id,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userIdToUpdate,
      details: { changedFor: user.username },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Password for "${user.username}" updated successfully!` });
  } catch (error) {
    console.error('changePassword error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};
