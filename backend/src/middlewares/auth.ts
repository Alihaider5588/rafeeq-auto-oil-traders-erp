import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { Role } from '../types/enums';
import { getJwtSecret } from '../utils/security';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: Role;
    permissions?: string[];
  };
}

export const userAuthCache = new Map<string, {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  permissions: string[];
  isActive: boolean;
  expiry: number;
}>();

export const clearUserAuthCache = (userId?: string) => {
  if (userId) userAuthCache.delete(userId);
  else userAuthCache.clear();
};

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
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as {
      id: string;
      username: string;
      role: Role;
    };

    let user: any = null;
    const cached = userAuthCache.get(decoded.id);
    if (cached && Date.now() < cached.expiry) {
      if (!cached.isActive) {
        res.status(401).json({ success: false, message: 'User account is inactive or not found' });
        return;
      }
      req.user = {
        id: cached.id,
        username: cached.username,
        fullName: cached.fullName,
        role: cached.role,
        permissions: cached.permissions,
      };
      return next();
    }

    user = await prisma.user.findUnique({
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

    userAuthCache.set(user.id, {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as Role,
      permissions: parsedPerms,
      isActive: user.isActive,
      expiry: Date.now() + 3 * 60 * 1000,
    });

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

export const authorize = (allowedRoles: Role[], requiredPerm?: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role === Role.ADMIN) {
      return next();
    }

    // Granular permission check: if user has custom permissions assigned by Admin
    if (req.user.permissions && Array.isArray(req.user.permissions) && req.user.permissions.length > 0) {
      if (requiredPerm) {
        const perms = Array.isArray(requiredPerm) ? requiredPerm : [requiredPerm];
        if (perms.some((p) => req.user!.permissions!.includes(p))) {
          return next();
        }
        res.status(403).json({
          success: false,
          message: `Forbidden: permission '${perms.join(' or ')}' required`,
        });
        return;
      }
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
