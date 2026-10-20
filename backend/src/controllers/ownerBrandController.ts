import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { logAudit } from '../services/auditService';
import { Role } from '../types/enums';
import { Prisma } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'rafeeque_super_secure_jwt_secret_token_key_2026_oil_traders';

// 1. Password Re-verification endpoint for confidential access
export const verifyOwnerBrandAccess = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== Role.ADMIN) {
      res.status(403).json({ success: false, message: 'Access denied: Administrator privileges required.' });
      return;
    }

    const { password } = req.body;
    if (!password) {
      res.status(400).json({ success: false, message: 'Password re-verification is required.' });
      return;
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!adminUser) {
      res.status(403).json({ success: false, message: 'Access denied.' });
      return;
    }

    const isValid = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isValid) {
      await logAudit({
        userId: req.user.id,
        action: 'CONFIDENTIAL_AUTH_FAILED',
        entityType: 'OWNER_BRAND',
        details: { reason: 'Incorrect admin verification password' },
        ipAddress: req.ip,
      });

      res.status(401).json({ success: false, message: 'Invalid verification password.' });
      return;
    }

    // Generate short-lived (15 minutes) owner brand token
    const ownerToken = jwt.sign(
      { id: adminUser.id, role: Role.ADMIN, scope: 'OWNER_BRAND_CONFIDENTIAL' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    await logAudit({
      userId: req.user.id,
      action: 'CONFIDENTIAL_AUTH_SUCCESS',
      entityType: 'OWNER_BRAND',
      details: { accessGranted: true },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Confidential access unlocked for 15 minutes.',
      ownerToken,
      token: ownerToken,
    });
  } catch (error) {
    console.error('verifyOwnerBrandAccess error:', error);
    res.status(500).json({ success: false, message: 'Verification error' });
  }
};

// Middleware to verify short-lived Owner Brand token in header
export const requireOwnerBrandAuth = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (req.user?.role !== Role.ADMIN) {
    res.status(403).json({ success: false, message: 'Forbidden: Confidential owner data.' });
    return;
  }

  const token = req.headers['x-owner-token'] as string;
  if (!token) {
    res.status(401).json({ success: false, message: 'Re-verification required: Please unlock confidential module.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.scope !== 'OWNER_BRAND_CONFIDENTIAL' || decoded.id !== req.user.id) {
      res.status(403).json({ success: false, message: 'Invalid confidential authorization session.' });
      return;
    }
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Confidential session expired. Please re-enter your password.' });
  }
};

// 2. Owner Brand Products CRUD
const ownerProductSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  brandName: z.string().default('Private Owner Brand'),
  category: z.string().default('Lubricant'),
  unit: z.string().default('Liter'),
  purchaseCost: z.number().min(0),
  salePrice: z.number().min(0),
  currentStock: z.number().min(0).default(0),
  minimumStockLevel: z.number().min(0).default(5),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const getOwnerBrandProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const products = await prisma.ownerBrandProduct.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve records' });
  }
};

export const createOwnerBrandProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parsed = ownerProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;
    const existing = await prisma.ownerBrandProduct.findUnique({ where: { sku: data.sku.trim() } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Product SKU already exists' });
      return;
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.ownerBrandProduct.create({
        data: {
          name: data.name.trim(),
          sku: data.sku.trim(),
          brandName: data.brandName.trim(),
          category: data.category.trim(),
          unit: data.unit.trim(),
          purchaseCost: new Prisma.Decimal(data.purchaseCost),
          salePrice: new Prisma.Decimal(data.salePrice),
          currentStock: new Prisma.Decimal(data.currentStock),
          minimumStockLevel: new Prisma.Decimal(data.minimumStockLevel),
          notes: data.notes?.trim() || null,
          isActive: data.isActive,
        },
      });

      if (data.currentStock > 0) {
        await tx.ownerBrandStockMovement.create({
          data: {
            productId: p.id,
            movementType: 'OPENING_STOCK',
            quantity: new Prisma.Decimal(data.currentStock),
            previousStock: new Prisma.Decimal(0),
            newStock: new Prisma.Decimal(data.currentStock),
            description: 'Confidential Opening Stock Entry',
          },
        });
      }

      return p;
    });

    await logAudit({
      userId: req.user?.id,
      action: 'CONFIDENTIAL_PRODUCT_CREATED',
      entityType: 'OWNER_BRAND_PRODUCT',
      entityId: product.id,
      details: { sku: product.sku },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create private product' });
  }
};

export const updateOwnerBrandProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.ownerBrandProduct.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.brandName !== undefined) updateData.brandName = body.brandName.trim();
    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.unit !== undefined) updateData.unit = body.unit.trim();
    if (body.purchaseCost !== undefined) updateData.purchaseCost = new Prisma.Decimal(body.purchaseCost);
    if (body.salePrice !== undefined) updateData.salePrice = new Prisma.Decimal(body.salePrice);
    if (body.minimumStockLevel !== undefined) updateData.minimumStockLevel = new Prisma.Decimal(body.minimumStockLevel);
    if (body.notes !== undefined) updateData.notes = body.notes ? body.notes.trim() : null;
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const product = await prisma.ownerBrandProduct.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update record' });
  }
};

// 3. Owner Brand Suppliers
export const getOwnerBrandSuppliers = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const suppliers = await prisma.ownerBrandSupplier.findMany({ orderBy: { companyName: 'asc' } });
    res.json({ success: true, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve suppliers' });
  }
};

export const createOwnerBrandSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companyName, contactPerson, phone, address, notes } = req.body;
    if (!companyName || !phone) {
      res.status(400).json({ success: false, message: 'Company name and phone are required' });
      return;
    }

    const supplier = await prisma.ownerBrandSupplier.create({
      data: {
        companyName: companyName.trim(),
        contactPerson: contactPerson ? contactPerson.trim() : null,
        phone: phone.trim(),
        address: address ? address.trim() : null,
        notes: notes ? notes.trim() : null,
      },
    });

    res.status(201).json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create supplier' });
  }
};

// 4. Owner Brand Purchases
export const getOwnerBrandPurchases = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const purchases = await prisma.ownerBrandPurchase.findMany({
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
      orderBy: { purchaseDate: 'desc' },
    });
    res.json({ success: true, purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve purchases' });
  }
};

export const createOwnerBrandPurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let { supplierId, invoiceNumber, items, paidAmount = 0, paymentMethod = 'CASH', notes, receiptUrl, receiptData } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'At least one product item is required.' });
      return;
    }

    if (!invoiceNumber) {
      invoiceNumber = `OB-PUR-${Date.now().toString().slice(-8)}`;
    }

    // If no supplier selected or unlisted, fallback to/create default Spot Supplier
    if (!supplierId) {
      let defaultSup = await prisma.ownerBrandSupplier.findFirst({
        where: { companyName: 'Direct Spot Refinery / Cash Market' }
      });
      if (!defaultSup) {
        defaultSup = await prisma.ownerBrandSupplier.create({
          data: {
            companyName: 'Direct Spot Refinery / Cash Market',
            phone: '0300-0000000',
            address: 'Spot Cash Purchase',
          }
        });
      }
      supplierId = defaultSup.id;
    }

    let totalAmount = 0;
    for (const it of items) {
      totalAmount += it.quantity * it.unitCost;
    }

    const remainingAmount = totalAmount - paidAmount;

    const purchase = await prisma.$transaction(async (tx) => {
      const p = await tx.ownerBrandPurchase.create({
        data: {
          invoiceNumber: invoiceNumber.trim(),
          supplierId,
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          remainingAmount: new Prisma.Decimal(remainingAmount),
          paymentMethod,
          notes: notes || null,
          receiptUrl: receiptUrl || null,
          receiptData: receiptData ? (typeof receiptData === 'string' ? receiptData : JSON.stringify(receiptData)) : null,
          createdById: req.user!.id,

          items: {
            create: items.map((it: any) => ({
              productId: it.productId,
              quantity: new Prisma.Decimal(it.quantity),
              unitCost: new Prisma.Decimal(it.unitCost),
              totalCost: new Prisma.Decimal(it.quantity * it.unitCost),
            })),
          },
        },
        include: { items: true },
      });

      // Increase Stock
      for (const it of items) {
        const prod = await tx.ownerBrandProduct.findUnique({ where: { id: it.productId } });
        if (prod) {
          const cur = Number(prod.currentStock);
          const nxt = cur + it.quantity;

          await tx.ownerBrandProduct.update({
            where: { id: it.productId },
            data: {
              currentStock: new Prisma.Decimal(nxt),
              purchaseCost: new Prisma.Decimal(it.unitCost),
            },
          });

          await tx.ownerBrandStockMovement.create({
            data: {
              productId: it.productId,
              movementType: 'PURCHASE',
              quantity: new Prisma.Decimal(it.quantity),
              previousStock: new Prisma.Decimal(cur),
              newStock: new Prisma.Decimal(nxt),
              referenceId: p.id,
              description: `Owner Brand Inward #${invoiceNumber}`,
            },
          });
        }
      }

      // Update supplier balance
      const sup = await tx.ownerBrandSupplier.findUnique({ where: { id: supplierId } });
      if (sup) {
        await tx.ownerBrandSupplier.update({
          where: { id: supplierId },
          data: { currentPayable: new Prisma.Decimal(Number(sup.currentPayable) + remainingAmount) },
        });
      }

      return p;
    });

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    console.error('createOwnerBrandPurchase error:', error);
    res.status(500).json({ success: false, message: 'Failed to record owner purchase' });
  }
};

// 5. Owner Brand Sales
export const getOwnerBrandSales = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sales = await prisma.ownerBrandSale.findMany({
      include: {
        items: { include: { product: true } },
      },
      orderBy: { saleDate: 'desc' },
    });
    res.json({ success: true, sales });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve sales' });
  }
};

export const createOwnerBrandSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerName, items, receivedAmount = 0, paymentMethod = 'CASH', notes } = req.body;

    if (!customerName || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Customer name and items are required' });
      return;
    }

    let totalAmount = 0;
    let totalCost = 0;
    const itemDetails: any[] = [];

    for (const it of items) {
      const prod = await prisma.ownerBrandProduct.findUnique({ where: { id: it.productId } });
      if (!prod) {
        res.status(404).json({ success: false, message: `Product not found: ${it.productId}` });
        return;
      }

      const curStock = Number(prod.currentStock);
      if (curStock < it.quantity) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for '${prod.name}'. In stock: ${curStock}, Requested: ${it.quantity}`,
        });
        return;
      }

      const lineTotal = it.quantity * it.unitPrice;
      const lineCost = it.quantity * Number(prod.purchaseCost);
      const lineProfit = lineTotal - lineCost;

      totalAmount += lineTotal;
      totalCost += lineCost;

      itemDetails.push({
        productId: prod.id,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        unitCost: Number(prod.purchaseCost),
        totalPrice: lineTotal,
        profit: lineProfit,
        curStock,
      });
    }

    const grossProfit = totalAmount - totalCost;
    const invoiceNumber = `OB-INV-${Date.now().toString().slice(-8)}`;

    const sale = await prisma.$transaction(async (tx) => {
      const s = await tx.ownerBrandSale.create({
        data: {
          invoiceNumber,
          customerName: customerName.trim(),
          totalAmount: new Prisma.Decimal(totalAmount),
          receivedAmount: new Prisma.Decimal(receivedAmount),
          totalCost: new Prisma.Decimal(totalCost),
          grossProfit: new Prisma.Decimal(grossProfit),
          paymentMethod,
          notes: notes || null,
          createdById: req.user!.id,
          items: {
            create: itemDetails.map((it) => ({
              productId: it.productId,
              quantity: new Prisma.Decimal(it.quantity),
              unitPrice: new Prisma.Decimal(it.unitPrice),
              unitCost: new Prisma.Decimal(it.unitCost),
              totalPrice: new Prisma.Decimal(it.totalPrice),
              profit: new Prisma.Decimal(it.profit),
            })),
          },
        },
        include: { items: true },
      });

      // Deduct stock
      for (const it of itemDetails) {
        const nxt = it.curStock - it.quantity;
        await tx.ownerBrandProduct.update({
          where: { id: it.productId },
          data: { currentStock: new Prisma.Decimal(nxt) },
        });

        await tx.ownerBrandStockMovement.create({
          data: {
            productId: it.productId,
            movementType: 'SALE',
            quantity: new Prisma.Decimal(it.quantity),
            previousStock: new Prisma.Decimal(it.curStock),
            newStock: new Prisma.Decimal(nxt),
            referenceId: s.id,
            description: `Owner Brand Sale #${invoiceNumber}`,
          },
        });
      }

      return s;
    });

    res.status(201).json({ success: true, sale });
  } catch (error) {
    console.error('createOwnerBrandSale error:', error);
    res.status(500).json({ success: false, message: 'Failed to record owner sale' });
  }
};

// 6. Confidential Report Summary
export const getOwnerBrandReport = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [products, sales, purchases] = await Promise.all([
      prisma.ownerBrandProduct.findMany(),
      prisma.ownerBrandSale.findMany({ include: { items: true } }),
      prisma.ownerBrandPurchase.findMany(),
    ]);

    let totalInventoryValuation = 0;
    let totalStockUnits = 0;
    for (const p of products) {
      const stock = Number(p.currentStock);
      totalStockUnits += stock;
      totalInventoryValuation += stock * Number(p.purchaseCost);
    }

    let totalRevenue = 0;
    let totalCostOfGoodsSold = 0;
    let totalGrossProfit = 0;
    for (const s of sales) {
      totalRevenue += Number(s.totalAmount);
      totalCostOfGoodsSold += Number(s.totalCost);
      totalGrossProfit += Number(s.grossProfit);
    }

    let totalPurchasesAmount = 0;
    for (const p of purchases) {
      totalPurchasesAmount += Number(p.totalAmount);
    }

    const marginPercentage = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    res.json({
      success: true,
      summary: {
        totalProducts: products.length,
        totalStockUnits,
        totalInventoryValuation,
        totalRevenue,
        totalCostOfGoodsSold,
        totalGrossProfit,
        marginPercentage: Math.round(marginPercentage * 10) / 10,
        totalPurchasesAmount,
        totalSalesCount: sales.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate confidential report' });
  }
};

// 7. Delete / Remove Mistaken Confidential Brand Sale (Admin Only)
export const deleteOwnerBrandSale = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const sale = await prisma.ownerBrandSale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!sale) {
      res.status(404).json({ success: false, message: 'Confidential order/sale not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Reverse stock deducted for each item
      for (const it of sale.items) {
        const prod = await tx.ownerBrandProduct.findUnique({ where: { id: it.productId } });
        if (prod) {
          const curStock = Number(prod.currentStock);
          const restoredStock = curStock + Number(it.quantity);

          await tx.ownerBrandProduct.update({
            where: { id: it.productId },
            data: { currentStock: new Prisma.Decimal(restoredStock) },
          });

          await tx.ownerBrandStockMovement.create({
            data: {
              productId: it.productId,
              movementType: 'ADJUSTMENT',
              quantity: it.quantity,
              previousStock: new Prisma.Decimal(curStock),
              newStock: new Prisma.Decimal(restoredStock),
              referenceId: sale.id,
              description: `Admin Deleted Mistaken Sale #${sale.invoiceNumber}`,
            },
          });
        }
      }

      // 2. Delete the sale items & sale
      await tx.ownerBrandSaleItem.deleteMany({ where: { saleId: sale.id } });
      await tx.ownerBrandSale.delete({ where: { id: sale.id } });
    });

    res.json({
      success: true,
      message: `Confidential Sale #${sale.invoiceNumber} removed and stock restored successfully`,
    });
  } catch (error: any) {
    console.error('deleteOwnerBrandSale error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to remove confidential sale' });
  }
};

// 8. Delete / Remove Mistaken Confidential Brand Purchase (Admin Only)
export const deleteOwnerBrandPurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const purchase = await prisma.ownerBrandPurchase.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!purchase) {
      res.status(404).json({ success: false, message: 'Confidential purchase not found' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Deduct inward stock added by this purchase
      for (const it of purchase.items) {
        const prod = await tx.ownerBrandProduct.findUnique({ where: { id: it.productId } });
        if (prod) {
          const curStock = Number(prod.currentStock);
          const reversedStock = Math.max(0, curStock - Number(it.quantity));

          await tx.ownerBrandProduct.update({
            where: { id: it.productId },
            data: { currentStock: new Prisma.Decimal(reversedStock) },
          });

          await tx.ownerBrandStockMovement.create({
            data: {
              productId: it.productId,
              movementType: 'ADJUSTMENT',
              quantity: it.quantity,
              previousStock: new Prisma.Decimal(curStock),
              newStock: new Prisma.Decimal(reversedStock),
              referenceId: purchase.id,
              description: `Admin Deleted Mistaken Purchase #${purchase.invoiceNumber}`,
            },
          });
        }
      }

      // 2. Adjust supplier payable if applicable
      const remainingUnpaid = Number(purchase.totalAmount) - Number(purchase.paidAmount);
      if (remainingUnpaid > 0) {
        const sup = await tx.ownerBrandSupplier.findUnique({ where: { id: purchase.supplierId } });
        if (sup) {
          const curPayable = Number(sup.currentPayable);
          await tx.ownerBrandSupplier.update({
            where: { id: purchase.supplierId },
            data: { currentPayable: new Prisma.Decimal(Math.max(0, curPayable - remainingUnpaid)) },
          });
        }
      }

      // 3. Delete purchase items & purchase
      await tx.ownerBrandPurchaseItem.deleteMany({ where: { purchaseId: purchase.id } });
      await tx.ownerBrandPurchase.delete({ where: { id: purchase.id } });
    });

    res.json({
      success: true,
      message: `Confidential Purchase #${purchase.invoiceNumber} removed and stock adjusted successfully`,
    });
  } catch (error: any) {
    console.error('deleteOwnerBrandPurchase error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to remove confidential purchase' });
  }
};

// 7. Change Confidential Vault / Admin Master Password
export const changeVaultPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== Role.ADMIN) {
      res.status(403).json({ success: false, message: 'Access denied: Administrator privileges required.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current password and new password are both required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!adminUser) {
      res.status(403).json({ success: false, message: 'User not found.' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, adminUser.passwordHash);
    if (!isValid) {
      await logAudit({
        userId: req.user.id,
        action: 'VAULT_PASSWORD_CHANGE_FAILED',
        entityType: 'OWNER_BRAND',
        details: { reason: 'Incorrect current password' },
        ipAddress: req.ip,
      });

      res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      return;
    }

    const newSalt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, newSalt);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash },
    });

    await logAudit({
      userId: req.user.id,
      action: 'VAULT_PASSWORD_CHANGED',
      entityType: 'OWNER_BRAND',
      details: { updated: true },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Confidential Vault password changed successfully. Please remember your new password.',
    });
  } catch (error: any) {
    console.error('changeVaultPassword error:', error);
    res.status(500).json({ success: false, message: 'Failed to update vault password.' });
  }
};

// 12. Offline Receipt Parser & OCR Extractor (No external API keys required)
export const parseReceiptData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rawText, receiptBase64, fileName } = req.body;

    let textToAnalyze = (rawText || '').toString();

    // Natural Language / Heuristic Regular Expressions for Pakistani Invoices & Receipts
    // 1. Detect Total Amount (e.g. Total: Rs. 150,000 or Net Amount 85,000 or Rs. 45000)
    let detectedTotal: number | null = null;
    const totalMatch = textToAnalyze.match(/(?:total|net\s*amount|grand\s*total|gross\s*amount|amount|kul\s*raqam|bill\s*amount)[:\s=Rs.-]*([\d,]+(?:\.\d{1,2})?)/i)
      || textToAnalyze.match(/rs\.?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (totalMatch && totalMatch[1]) {
      const cleanNum = Number(totalMatch[1].replace(/,/g, ''));
      if (!isNaN(cleanNum) && cleanNum > 0) {
        detectedTotal = cleanNum;
      }
    }

    // 2. Detect Invoice / Bilty / Receipt Number
    let detectedInvoiceNumber: string | null = null;
    const invMatch = textToAnalyze.match(/(?:invoice|bill|receipt|bilty|challan|inv)[\s#.:-]*([A-Za-z0-9-]+)/i);
    if (invMatch && invMatch[1]) {
      detectedInvoiceNumber = invMatch[1].trim();
    }

    // 3. Detect Supplier / Refinery Company Name
    let detectedSupplierName: string | null = null;
    const supMatch = textToAnalyze.match(/(?:supplier|m\/s|messrs|from|company|refinery|distributor)[:\s-]*([A-Za-z0-9\s&.,-]{3,40})/i);
    if (supMatch && supMatch[1]) {
      detectedSupplierName = supMatch[1].split('\n')[0].trim();
    }

    // 4. Detect Quantity and Unit Cost
    let detectedQty: number = 1;
    let detectedUnitCost: number = detectedTotal || 0;

    const qtyMatch = textToAnalyze.match(/(?:qty|quantity|drums?|cans?|liters?|ltr|bottles?)[:\s=]*(\d+(?:\.\d+)?)/i);
    if (qtyMatch && qtyMatch[1]) {
      const parsedQty = Number(qtyMatch[1]);
      if (parsedQty > 0) {
        detectedQty = parsedQty;
        if (detectedTotal && detectedTotal > 0) {
          detectedUnitCost = Math.round(detectedTotal / detectedQty);
        }
      }
    }

    const costMatch = textToAnalyze.match(/(?:rate|unit\s*cost|unit\s*price|price\/drum|price\/ltr)[:\s=Rs.-]*([\d,]+(?:\.\d{1,2})?)/i);
    if (costMatch && costMatch[1]) {
      const parsedCost = Number(costMatch[1].replace(/,/g, ''));
      if (!isNaN(parsedCost) && parsedCost > 0) {
        detectedUnitCost = parsedCost;
      }
    }

    res.json({
      success: true,
      data: {
        invoiceNumber: detectedInvoiceNumber || `RCPT-${Date.now().toString().slice(-6)}`,
        supplierName: detectedSupplierName || 'Direct Refinery / Spot Supplier',
        totalAmount: detectedTotal || (detectedQty * detectedUnitCost),
        quantity: detectedQty,
        unitCost: detectedUnitCost,
        rawTextLength: textToAnalyze.length,
        fileName: fileName || 'receipt_scan.png',
        receiptUrl: receiptBase64 || null
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to process receipt' });
  }
};

