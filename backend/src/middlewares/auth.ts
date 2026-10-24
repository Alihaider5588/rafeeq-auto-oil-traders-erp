import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { Role } from '../types/enums';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: Role;
    permissions?: string[];
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'rafeeque_super_secret_jwt_key_2026';
    const decoded = jwt.verify(token, secret) as {
      id: string;
      username: string;
      role: Role;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User account is inactive or not found' });
      return;
    }

    let parsedPerms: string[] = [];
    if (user.permissions) {
      try {
        parsedPerms = JSON.parse(user.permissions);
      } catch {
        parsedPerms = [];
      }
    }

    req.user = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as Role,
      permissions: parsedPerms,
    };
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
};

export const authorize = (allowedRoles: Role[], requiredPerm?: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role === Role.ADMIN) {
      return next();
    }

    // Granular permission check: if user has been granted permission by Admin for this tab/module
    if (requiredPerm && req.user.permissions && Array.isArray(req.user.permissions) && req.user.permissions.includes(requiredPerm)) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' does not have access to this resource`,
      });
      return;
    }

    next();
  };
};
