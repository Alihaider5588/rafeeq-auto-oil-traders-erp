# Deployment Guide: Free Cloud & Vercel Setup
## Rafiq Auto & Oil Traders POS & ERP System

This project is configured to run 100% free on modern cloud platforms with zero headaches.

---

### Step 1: Free Cloud Database (PostgreSQL / Firebase / Neon / Supabase)

Your project uses **Prisma ORM**. To run in the cloud (where local SQLite files are not persistent), connect any free cloud database:

#### Option A: Neon.tech (Recommended - Free Serverless Postgres in 30 Seconds)
1. Go to [https://neon.tech](https://neon.tech) and Sign up for free (or use Google / GitHub login).
2. Click **Create Project** -> Name it `rafiq-oil-traders`.
3. Copy the provided connection string:
   `postgresql://neondb_owner:YOUR_PASSWORD@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require`

#### Option B: Supabase / Firebase / Railway
- Go to [https://supabase.com](https://supabase.com) -> New Project -> Copy Database Connection URL.

#### Add URL to Backend:
In `backend/.env`, set:
```env
DATABASE_URL="your-cloud-database-url-here"
```

To initialize your cloud database tables and seed data, run:
```bash
cd backend
npx prisma db push
npm run prisma:seed
```

---

### Step 2: Deploy Backend to Vercel or Render

#### Option A: Deploy to Vercel (Serverless)
1. In Vercel ([https://vercel.com](https://vercel.com)), click **Add New Project**.
2. Select your repository, set the **Root Directory** to `backend`.
3. Add Environment Variables:
   - `DATABASE_URL`: `[Your cloud Postgres connection string]`
   - `JWT_SECRET`: `rafeeque_super_secure_jwt_secret_token_key_2026_oil_traders`
   - `NODE_ENV`: `production`
4. Click **Deploy**. Vercel will give you a backend URL like `https://rafiq-backend.vercel.app`.

---

### Step 3: Deploy Frontend to Vercel (1-Click)

1. In Vercel, click **Add New Project**.
2. Select the repository, set **Root Directory** to `frontend`.
3. Add Environment Variable:
   - `VITE_API_URL`: `https://rafiq-backend.vercel.app/api` (or your backend URL)
4. Click **Deploy**.
5. Your system will be live at `https://rafiq-pos.vercel.app`!

---

### Step 4: Login Credentials (Live System)

- **Admin Account:** `admin` / `Admin@123`
- **Operator Account:** `operator` / `Operator@123`
- **Cashier Account:** `cashier` / `Cashier@123`
- **Salesman Account:** `salesman` / `Salesman@123`
- **Confidential Brand Master Password:** `admin123`
