import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitizes data to prevent:
 * 1. Prototype Pollution (__proto__, constructor, prototype)
 * 2. Null-Byte Poisoning attacks (\0)
 */
const sanitizeData = (value: any): any => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Strip null-byte characters used in file/path injection attacks
    return value.replace(/\0/g, '');
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeData);
  }

  if (typeof value === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      // Disallow Prototype Pollution keywords
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitizedObj[key] = sanitizeData(value[key]);
    }
    return sanitizedObj;
  }

  return value;
};

/**
 * Express Middleware: Input Sanitizer
 * Safeguards request payloads against prototype pollution and null-byte tampering.
 */
export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeData(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeData(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeData(req.params);
  }
  next();
};

