# RAFFEEQUE OIL TRADERS - SYSTEM ARCHITECTURE SPECIFICATION

## Overview
A commercial-grade Oil Trading, Multi-Location Inventory, Van Distribution, Ledger, and POS Management System built with a Node.js + TypeScript + PostgreSQL REST API backend and a React + TypeScript responsive frontend.

## Database Entities (PostgreSQL via Prisma ORM)
1. **User & Auth**: `User`, `Role` (ADMIN, CASHIER, OPERATOR, SALESMAN), `AuditLog`, `SystemSetting`
2. **Catalog & Inventory**: `Category`, `Unit`, `Product`, `StockMovement`
3. **Partners**: `Supplier`, `Customer`
4. **Procurement**: `Purchase`, `PurchaseItem`, `PurchaseReturn`, `PurchaseReturnItem`
5. **Sales & Orders**: `Sale`, `SaleItem`, `SalesReturn`, `SalesReturnItem`
6. **Accounting & Ledgers**: `Payment`, `CustomerLedger`, `SupplierLedger`, `CashSummary`
7. **Distribution & Logistics**: `Vehicle`, `Driver`, `SupplyMan`, `DailyDelivery`, `DeliveryItem`

## Role-Based Portals & Flows
- **Admin**: Full control, dashboard KPIs, gross profit analysis, system configuration, audit logs.
- **Cashier**: Daily cash register, payment vouchers, customer ledger receipts, sale invoice settlement.
- **Computer Operator**: Inward purchases, desk POS sales, salesman pending orders approval, van delivery dispatches.
- **Salesman (Mobile-First)**: Quick touch-based catalog, customer balance check, offline-resilient sales submission, collection receipt generation.

