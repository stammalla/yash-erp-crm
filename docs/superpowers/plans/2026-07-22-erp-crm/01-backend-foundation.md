# Phase 1 — Backend Foundation

**Produces:** Backend scaffold, Prisma schema, config, error handling, auth (login + JWT + RBAC), user management.

All paths are relative to repo root. Run backend commands from `backend/`.

---

### Task 1: Scaffold the backend project

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/.env.example`, `backend/.gitignore`, `backend/src/app.ts`, `backend/src/server.ts`

- [ ] **Step 1: Initialize package and install deps**

Run from `backend/`:
```bash
npm init -y
npm i express cors helmet morgan dotenv zod bcryptjs jsonwebtoken @prisma/client
npm i -D typescript ts-node-dev @types/node @types/express @types/cors @types/morgan @types/bcryptjs @types/jsonwebtoken prisma jest ts-jest @types/jest supertest @types/supertest
npx tsc --init
```

- [ ] **Step 2: Configure `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Add scripts to `package.json`**

```json
"scripts": {
  "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "jest --runInBand",
  "prisma:migrate": "prisma migrate dev",
  "prisma:generate": "prisma generate",
  "seed": "ts-node-dev --transpile-only prisma/seed.ts"
}
```

- [ ] **Step 4: Create `backend/.env.example`**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp_crm?schema=public"
JWT_SECRET="change-me-in-prod"
JWT_EXPIRES_IN="7d"
PORT=3000
FRONTEND_URL="http://localhost:5173"
# Bonus (S3 image upload)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_S3_BUCKET=""
AWS_REGION="ap-south-1"
```

- [ ] **Step 5: Create `backend/.gitignore`**

```
node_modules
dist
.env
```

- [ ] **Step 6: Create `backend/src/app.ts`**

```ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_URL ?? '*' }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Routers mounted in later tasks.

  return app;
}
```

- [ ] **Step 7: Create `backend/src/server.ts`**

```ts
import 'dotenv/config';
import { createApp } from './app';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();
app.listen(port, () => console.log(`API listening on :${port}`));
```

- [ ] **Step 8: Verify it boots**

Run: `npm run dev` then in another shell `curl http://localhost:3000/health`
Expected: `{"status":"ok"}`

- [ ] **Step 9: Commit**

```bash
git add backend
git commit -m "chore: scaffold express + typescript backend"
```

---

### Task 2: Prisma schema and initial migration

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

Run: `npx prisma init` (creates `prisma/schema.prisma`; keep the generated `.env` DATABASE_URL or reuse existing).

- [ ] **Step 2: Write `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role { admin sales warehouse accounts }
enum CustomerType { retail wholesale distributor }
enum CustomerStatus { lead active inactive }
enum MovementType { in_ out }
enum ChallanStatus { draft confirmed cancelled }
enum PaymentStatus { unpaid partial paid }

model User {
  id           String   @id @default(uuid())
  name         String
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  customers    Customer[]
  notes        CustomerNote[]
  products     Product[]
  movements    StockMovement[]
  challans     Challan[]
  invoices     Invoice[]

  @@map("users")
}

model Customer {
  id           String         @id @default(uuid())
  name         String
  mobile       String
  email        String?
  businessName String?        @map("business_name")
  gstNumber    String?        @map("gst_number")
  type         CustomerType
  address      String?
  status       CustomerStatus @default(lead)
  followUpDate DateTime?      @map("follow_up_date")
  createdBy    String?        @map("created_by")
  creator      User?          @relation(fields: [createdBy], references: [id])
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")

  notes        CustomerNote[]
  challans     Challan[]
  invoices     Invoice[]

  @@map("customers")
}

model CustomerNote {
  id         String   @id @default(uuid())
  customerId String   @map("customer_id")
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  note       String
  createdBy  String?  @map("created_by")
  creator    User?    @relation(fields: [createdBy], references: [id])
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("customer_notes")
}

model Product {
  id                String   @id @default(uuid())
  name              String
  sku               String   @unique
  category          String?
  unitPrice         Decimal  @map("unit_price") @db.Decimal(10, 2)
  currentStock      Int      @default(0) @map("current_stock")
  minStockQty       Int      @default(0) @map("min_stock_qty")
  warehouseLocation String?  @map("warehouse_location")
  imageUrl          String?  @map("image_url")
  createdBy         String?  @map("created_by")
  creator           User?    @relation(fields: [createdBy], references: [id])
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  movements     StockMovement[]
  challanItems  ChallanItem[]

  @@map("products")
}

model StockMovement {
  id        String       @id @default(uuid())
  productId String       @map("product_id")
  product   Product      @relation(fields: [productId], references: [id])
  quantity  Int
  type      MovementType
  reason    String?
  createdBy String?      @map("created_by")
  creator   User?        @relation(fields: [createdBy], references: [id])
  createdAt DateTime     @default(now()) @map("created_at")

  @@map("stock_movements")
}

model Challan {
  id            String        @id @default(uuid())
  challanNumber String        @unique @map("challan_number")
  customerId    String        @map("customer_id")
  customer      Customer      @relation(fields: [customerId], references: [id])
  status        ChallanStatus @default(draft)
  totalQuantity Int           @default(0) @map("total_quantity")
  createdBy     String?       @map("created_by")
  creator       User?         @relation(fields: [createdBy], references: [id])
  createdAt     DateTime      @default(now()) @map("created_at")

  items   ChallanItem[]
  invoice Invoice?

  @@map("challans")
}

model ChallanItem {
  id          String  @id @default(uuid())
  challanId   String  @map("challan_id")
  challan     Challan @relation(fields: [challanId], references: [id], onDelete: Cascade)
  productId   String  @map("product_id")
  product     Product @relation(fields: [productId], references: [id])
  productName String  @map("product_name")
  productSku  String  @map("product_sku")
  unitPrice   Decimal @map("unit_price") @db.Decimal(10, 2)
  quantity    Int

  @@map("challan_items")
}

model Invoice {
  id            String        @id @default(uuid())
  invoiceNumber String        @unique @map("invoice_number")
  challanId     String        @unique @map("challan_id")
  challan       Challan       @relation(fields: [challanId], references: [id])
  customerId    String        @map("customer_id")
  customer      Customer      @relation(fields: [customerId], references: [id])
  subtotal      Decimal       @db.Decimal(10, 2)
  gstPercent    Decimal       @default(18) @map("gst_percent") @db.Decimal(5, 2)
  gstAmount     Decimal       @map("gst_amount") @db.Decimal(10, 2)
  totalAmount   Decimal       @map("total_amount") @db.Decimal(10, 2)
  paymentStatus PaymentStatus @default(unpaid) @map("payment_status")
  pdfUrl        String?       @map("pdf_url")
  createdBy     String?       @map("created_by")
  creator       User?         @relation(fields: [createdBy], references: [id])
  createdAt     DateTime      @default(now()) @map("created_at")

  @@map("invoices")
}
```

> Note: `MovementType` uses `in_`/`out` because `in` is reserved; map API value `"in"` ↔ enum `in_` in the service layer (Task 12).

- [ ] **Step 3: Create the migration**

Run: `npx prisma migrate dev --name init`
Expected: migration applied, Prisma Client generated.

- [ ] **Step 4: Create shared Prisma client `backend/src/lib/prisma.ts`**

```ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

- [ ] **Step 5: Commit**

```bash
git add backend/prisma backend/src/lib/prisma.ts
git commit -m "feat: add prisma schema and initial migration"
```

---

### Task 3: AppError and global error handler

**Files:**
- Create: `backend/src/lib/AppError.ts`, `backend/src/middleware/errorHandler.ts`
- Test: `backend/src/middleware/errorHandler.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from 'supertest';
import express from 'express';
import { AppError } from '../lib/AppError';
import { errorHandler } from './errorHandler';

function buildApp() {
  const app = express();
  app.get('/boom', () => { throw new AppError(422, 'bad thing', { field: 'x' }); });
  app.get('/unknown', () => { throw new Error('surprise'); });
  app.use(errorHandler);
  return app;
}

test('maps AppError to its status and payload', async () => {
  const res = await request(buildApp()).get('/boom');
  expect(res.status).toBe(422);
  expect(res.body).toEqual({ error: 'bad thing', details: { field: 'x' } });
});

test('maps unknown errors to 500', async () => {
  const res = await request(buildApp()).get('/unknown');
  expect(res.status).toBe(500);
  expect(res.body.error).toBe('Internal server error');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/middleware/errorHandler.test.ts`
Expected: FAIL (modules not found). Add `jest.config.js`:
```js
module.exports = { preset: 'ts-jest', testEnvironment: 'node' };
```

- [ ] **Step 3: Implement `backend/src/lib/AppError.ts`**

```ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

- [ ] **Step 4: Implement `backend/src/middleware/errorHandler.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/middleware/errorHandler.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/AppError.ts backend/src/middleware/errorHandler.ts backend/src/middleware/errorHandler.test.ts backend/jest.config.js
git commit -m "feat: add AppError and global error handler"
```

---

### Task 4: Zod validation middleware

**Files:**
- Create: `backend/src/middleware/validate.ts`
- Test: `backend/src/middleware/validate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validate } from './validate';
import { errorHandler } from './errorHandler';

const schema = z.object({ name: z.string().min(1) });

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/x', validate(schema), (req, res) => res.json(req.body));
  app.use(errorHandler);
  return app;
}

test('passes valid body through', async () => {
  const res = await request(buildApp()).post('/x').send({ name: 'ok' });
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('ok');
});

test('rejects invalid body with 400 and field errors', async () => {
  const res = await request(buildApp()).post('/x').send({ name: '' });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Validation failed');
  expect(res.body.details).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/middleware/validate.test.ts`
Expected: FAIL (validate not found).

- [ ] **Step 3: Implement `backend/src/middleware/validate.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../lib/AppError';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(400, 'Validation failed', result.error.flatten().fieldErrors));
    }
    req.body = result.data;
    next();
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/middleware/validate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/validate.ts backend/src/middleware/validate.test.ts
git commit -m "feat: add zod validation middleware"
```

---

### Task 5: JWT auth + authorize middleware

**Files:**
- Create: `backend/src/lib/jwt.ts`, `backend/src/middleware/authenticate.ts`, `backend/src/middleware/authorize.ts`, `backend/src/types/express.d.ts`
- Test: `backend/src/middleware/authenticate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from 'supertest';
import express from 'express';
import { signToken } from '../lib/jwt';
import { authenticate } from './authenticate';
import { authorize } from './authorize';
import { errorHandler } from './errorHandler';

process.env.JWT_SECRET = 'test-secret';

function buildApp() {
  const app = express();
  app.get('/me', authenticate, (req, res) => res.json(req.user));
  app.get('/admin', authenticate, authorize(['admin']), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

test('rejects missing token with 401', async () => {
  const res = await request(buildApp()).get('/me');
  expect(res.status).toBe(401);
});

test('accepts a valid token and exposes req.user', async () => {
  const token = signToken({ id: 'u1', role: 'sales', email: 'a@b.c' });
  const res = await request(buildApp()).get('/me').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.role).toBe('sales');
});

test('authorize blocks wrong role with 403', async () => {
  const token = signToken({ id: 'u1', role: 'sales', email: 'a@b.c' });
  const res = await request(buildApp()).get('/admin').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/middleware/authenticate.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `backend/src/types/express.d.ts`**

```ts
import 'express';

export interface AuthUser {
  id: string;
  role: 'admin' | 'sales' | 'warehouse' | 'accounts';
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
```

- [ ] **Step 4: Implement `backend/src/lib/jwt.ts`**

```ts
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types/express';

export function signToken(user: AuthUser): string {
  return jwt.sign(user, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
}
```

- [ ] **Step 5: Implement `backend/src/middleware/authenticate.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import { AppError } from '../lib/AppError';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing or invalid authorization header'));
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}
```

- [ ] **Step 6: Implement `backend/src/middleware/authorize.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError';
import { AuthUser } from '../types/express';

export function authorize(roles: AuthUser['role'][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'Forbidden'));
    next();
  };
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest src/middleware/authenticate.test.ts`
Expected: PASS (all three).

- [ ] **Step 8: Commit**

```bash
git add backend/src/lib/jwt.ts backend/src/middleware/authenticate.ts backend/src/middleware/authorize.ts backend/src/types/express.d.ts backend/src/middleware/authenticate.test.ts
git commit -m "feat: add jwt auth and authorize middleware"
```

---

### Task 6: Test DB harness

**Files:**
- Create: `backend/src/test/setup.ts`, `backend/jest.setup.js`

- [ ] **Step 1: Add a test database URL**

Add to `backend/.env`:
```
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp_crm_test?schema=public"
```
Create the DB: `createdb erp_crm_test` (or via psql). Apply schema: `DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy`.

- [ ] **Step 2: Create `backend/src/test/setup.ts`**

```ts
import { execSync } from 'child_process';
import { prisma } from '../lib/prisma';

export async function resetDb() {
  const tables = ['invoices', 'challan_items', 'challans', 'stock_movements', 'customer_notes', 'products', 'customers', 'users'];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE;`);
  }
}

export { execSync };
```

- [ ] **Step 3: Point Jest at the test DB via `backend/jest.setup.js`**

```js
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
```

Update `jest.config.js`:
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.js'],
};
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/test/setup.ts backend/jest.setup.js backend/jest.config.js
git commit -m "test: add postgres test harness"
```

---

### Task 7: Auth service + login endpoint

**Files:**
- Create: `backend/src/modules/auth/auth.service.ts`, `auth.controller.ts`, `auth.schema.ts`, `auth.router.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/modules/auth/auth.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';

const app = createApp();

beforeEach(async () => {
  await resetDb();
  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@erp.local', role: 'admin', passwordHash: await bcrypt.hash('Admin@123', 10) },
  });
});
afterAll(async () => { await prisma.$disconnect(); });

test('login returns a token and user for valid credentials', async () => {
  const res = await request(app).post('/auth/login').send({ email: 'admin@erp.local', password: 'Admin@123' });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(res.body.user.role).toBe('admin');
});

test('login rejects wrong password with 401', async () => {
  const res = await request(app).post('/auth/login').send({ email: 'admin@erp.local', password: 'nope' });
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/auth`
Expected: FAIL (route not mounted / 404).

- [ ] **Step 3: Implement `auth.schema.ts`**

```ts
import { z } from 'zod';
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

- [ ] **Step 4: Implement `auth.service.ts`**

```ts
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { signToken } from '../../lib/jwt';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new AppError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError(401, 'Invalid credentials');
  const token = signToken({ id: user.id, role: user.role, email: user.email });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}
```

- [ ] **Step 5: Implement `auth.controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './auth.service';

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    res.json(await service.login(email, password));
  } catch (e) { next(e); }
}
```

- [ ] **Step 6: Implement `auth.router.ts`**

```ts
import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { loginSchema } from './auth.schema';
import { loginHandler } from './auth.controller';

export const authRouter = Router();
authRouter.post('/login', validate(loginSchema), loginHandler);
```

- [ ] **Step 7: Mount router in `app.ts`**

Add after `app.use(morgan('dev'));`:
```ts
import { authRouter } from './modules/auth/auth.router';
// ...
app.use('/auth', authRouter);
```
And add the global `errorHandler` as the LAST middleware, before `return app;`:
```ts
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/modules/auth`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/auth backend/src/app.ts
git commit -m "feat: add auth login endpoint with jwt"
```

---

### Task 8: User management (admin only)

**Files:**
- Create: `backend/src/modules/users/users.service.ts`, `users.controller.ts`, `users.schema.ts`, `users.router.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/modules/users/users.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let adminToken: string;
let salesToken: string;

beforeEach(async () => {
  await resetDb();
  const admin = await prisma.user.create({ data: { name: 'A', email: 'a@erp.local', role: 'admin', passwordHash: await bcrypt.hash('x', 10) } });
  const sales = await prisma.user.create({ data: { name: 'S', email: 's@erp.local', role: 'sales', passwordHash: await bcrypt.hash('x', 10) } });
  adminToken = signToken({ id: admin.id, role: 'admin', email: admin.email });
  salesToken = signToken({ id: sales.id, role: 'sales', email: sales.email });
});
afterAll(async () => { await prisma.$disconnect(); });

test('admin can create a user', async () => {
  const res = await request(app).post('/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'W', email: 'w@erp.local', password: 'Ware@123', role: 'warehouse' });
  expect(res.status).toBe(201);
  expect(res.body.email).toBe('w@erp.local');
  expect(res.body.passwordHash).toBeUndefined();
});

test('non-admin cannot list users', async () => {
  const res = await request(app).get('/users').set('Authorization', `Bearer ${salesToken}`);
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/users`
Expected: FAIL.

- [ ] **Step 3: Implement `users.schema.ts`**

```ts
import { z } from 'zod';
export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'sales', 'warehouse', 'accounts']),
});
```

- [ ] **Step 4: Implement `users.service.ts`**

```ts
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';

const publicSelect = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true };

export async function listUsers() {
  return prisma.user.findMany({ select: publicSelect, orderBy: { createdAt: 'desc' } });
}

export async function createUser(input: { name: string; email: string; password: string; role: Role }) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new AppError(409, 'Email already in use');
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 10),
    },
    select: publicSelect,
  });
}
```

- [ ] **Step 5: Implement `users.controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './users.service';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.listUsers()); } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createUser(req.body)); } catch (e) { next(e); }
}
```

- [ ] **Step 6: Implement `users.router.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createUserSchema } from './users.schema';
import * as controller from './users.controller';

export const usersRouter = Router();
usersRouter.use(authenticate, authorize(['admin']));
usersRouter.get('/', controller.list);
usersRouter.post('/', validate(createUserSchema), controller.create);
```

- [ ] **Step 7: Mount in `app.ts`**

```ts
import { usersRouter } from './modules/users/users.router';
app.use('/users', usersRouter);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/modules/users`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/users backend/src/app.ts
git commit -m "feat: add admin user management"
```

---

**Phase 1 complete.** Run `npx jest` — all suites green. Proceed to `02-backend-modules.md`.
