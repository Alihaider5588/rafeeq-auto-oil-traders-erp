# RAFFEEQUE OIL TRADERS
## Enterprise Oil Trading, Inventory, POS, Ledger & Distribution Management System

A production-ready commercial ERP & POS platform built specifically for wholesale and retail engine oil distributors, lubricants trading, filter supply, and van route logistics.

---

## 🚀 Key Modules & System Architecture

1. **Role-Based Portals**:
   - **Admin Portal**: Executive KPI dashboards, profit & loss, user security, audit logs, system-wide settings.
   - **Cashier Portal**: Real-time counter drawer reconciliation, payment voucher posting, cash slip prints.
   - **Computer Operator Desk**: Inward goods entry (Maal Inward), sales billing, salesman order approval queue.
   - **Salesman Mobile-First Portal**: Touch-optimized interface for field salesmen with instant live synchronization to central server, offline-resilient cart, customer outstanding ledger, and immediate receipt generation.

2. **Core Accounting & Ledger Engine**:
   - Double-entry running balance ledgers for both **Customers** (Udhar/Receivables) and **Suppliers** (Payables).
   - Real-time gross margin calculation ($Profit = Revenue - Actual\ Cost$).
   - Immutable financial transaction audit log.

3. **Multi-Location Logistics & Van Dispatch**:
   - Delivery vehicles, drivers, and supply men route management.
   - Daily evening reconciliation report with customer visit counters, collections, returned goods, and sign-off sheets.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS corporate design system (high-contrast, responsive, touch-friendly), Lucide icons.
- **Backend**: Node.js 20+, Express.js, TypeScript, Prisma ORM, Helmet security, JWT authentication with bcrypt hashing, Zod validation.
- **Database**: PostgreSQL 16+.
- **Logistics & Deployment**: Docker, Docker Compose, Nginx.

---

## 📋 Default Credentials (Pre-seeded)

| Role | Username | Password | Notes |
|---|---|---|---|
| **Admin** | `admin` | `Admin@123` | Only ONE Admin account permitted |
| **Operator** | `operator` | `Operator@123` | Desktop POS & Inward entry |
| **Cashier** | `cashier` | `Cashier@123` | Counter cash & ledger receipts |
| **Salesman** | `salesman` | `Salesman@123` | Mobile field orders & collections |

---

## ⚙️ Running Locally (Without Docker)

### Prerequisites:
- Node.js 20+ installed
- PostgreSQL 14+ installed and running locally

### 1. Database & Backend Setup:
```bash
cd backend
npm install

# Setup environment variables:
cp .env.example .env
# Edit .env with your local PostgreSQL credentials:
# DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/rafeeque_oil_db?schema=public"

# Run migrations & seed data:
npx prisma db push
npx tsx prisma/seed.ts

# Start backend dev server:
npm run dev
# Backend will run on: http://localhost:5000
```

### 2. Frontend Setup:
```bash
cd ../frontend
npm install
npm run dev
# Frontend will run on: http://localhost:5173
```

---

## 🐳 Running with Docker (One-Command Deployment)

To run the complete full-stack environment (PostgreSQL + Backend API + Frontend + Nginx) with a single command:

```bash
docker compose up --build -d
```

- **Frontend Portal**: `http://localhost`
- **Backend REST API**: `http://localhost:5000`
- **PostgreSQL Database**: `localhost:5432`

---

## 💾 Database Backup & Disaster Recovery

### Creating a manual backup:
```bash
pg_dump -U rafeeque_user -h localhost rafeeque_oil_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restoring from backup:
```bash
psql -U rafeeque_user -h localhost -d rafeeque_oil_db < backup_file.sql
```

### Automated Daily Cron Backup (Linux VPS):
Add the following line to `crontab -e`:
```bash
0 2 * * * pg_dump -U rafeeque_user rafeeque_oil_db | gzip > /backups/rot_db_$(date +\%F).sql.gz
```

---

## 🔒 Security Best Practices Implemented
- Passwords hashed with bcrypt (salt rounds: 10).
- Role-based route authorization guards at both API and frontend levels.
- Parameterized SQL queries via Prisma ORM preventing SQL injection.
- Centralized audit trail recording all logins, sales, purchases, and payments.
