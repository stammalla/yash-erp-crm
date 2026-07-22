# Phase 2 — Backend Business Modules

**Produces:** Customers (CRM), Products + stock movements, Challans (atomic stock deduction), Invoices (+ PDF), Dashboard.

Prerequisite: Phase 1 complete. Each module follows the `schema → service → controller → router → mount` pattern established in Tasks 7–8. Reuse the test harness (`resetDb`, `signToken`).

---

### Task 9: Pagination + search helper

**Files:**
- Create: `backend/src/lib/pagination.ts`
- Test: `backend/src/lib/pagination.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { parsePagination } from './pagination';

test('defaults to page 1, limit 10', () => {
  expect(parsePagination({})).toEqual({ page: 1, limit: 10, skip: 0 });
});

test('clamps limit to 100 and computes skip', () => {
  expect(parsePagination({ page: '3', limit: '500' })).toEqual({ page: 3, limit: 100, skip: 200 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/pagination.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `backend/src/lib/pagination.ts`**

```ts
export interface Pagination { page: number; limit: number; skip: number; }

export function parsePagination(q: { page?: unknown; limit?: unknown }): Pagination {
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
}

export function paginated<T>(data: T[], total: number, p: Pagination) {
  return { data, meta: { page: p.page, limit: p.limit, total, totalPages: Math.ceil(total / p.limit) } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/pagination.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/pagination.ts backend/src/lib/pagination.test.ts
git commit -m "feat: add pagination helper"
```

---

### Task 10: Customers module

**Files:**
- Create: `backend/src/modules/customers/customers.{schema,service,controller,router}.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/modules/customers/customers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let salesToken: string;
let salesId: string;

beforeEach(async () => {
  await resetDb();
  const u = await prisma.user.create({ data: { name: 'S', email: 's@erp.local', role: 'sales', passwordHash: await bcrypt.hash('x', 10) } });
  salesId = u.id;
  salesToken = signToken({ id: u.id, role: 'sales', email: u.email });
});
afterAll(async () => { await prisma.$disconnect(); });

const auth = () => ({ Authorization: `Bearer ${salesToken}` });

test('creates a customer', async () => {
  const res = await request(app).post('/customers').set(auth())
    .send({ name: 'Acme', mobile: '9990001111', type: 'wholesale' });
  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Acme');
  expect(res.body.status).toBe('lead');
});

test('lists and searches customers with pagination', async () => {
  await prisma.customer.create({ data: { name: 'Alpha', mobile: '111', type: 'retail', createdBy: salesId } });
  await prisma.customer.create({ data: { name: 'Beta', mobile: '222', type: 'retail', createdBy: salesId } });
  const res = await request(app).get('/customers?search=Alph&page=1&limit=10').set(auth());
  expect(res.status).toBe(200);
  expect(res.body.data).toHaveLength(1);
  expect(res.body.meta.total).toBe(1);
});

test('adds a follow-up note and returns detail with notes', async () => {
  const c = await prisma.customer.create({ data: { name: 'Gamma', mobile: '333', type: 'retail', createdBy: salesId } });
  await request(app).post(`/customers/${c.id}/notes`).set(auth()).send({ note: 'called customer' });
  const res = await request(app).get(`/customers/${c.id}`).set(auth());
  expect(res.status).toBe(200);
  expect(res.body.notes).toHaveLength(1);
  expect(res.body.notes[0].note).toBe('called customer');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/customers`
Expected: FAIL.

- [ ] **Step 3: Implement `customers.schema.ts`**

```ts
import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(5),
  email: z.string().email().optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  type: z.enum(['retail', 'wholesale', 'distributor']),
  address: z.string().optional(),
  status: z.enum(['lead', 'active', 'inactive']).optional(),
  followUpDate: z.coerce.date().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
export const noteSchema = z.object({ note: z.string().min(1) });
```

- [ ] **Step 4: Implement `customers.service.ts`**

```ts
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';

export async function listCustomers(search: string | undefined, p: Pagination) {
  const where: Prisma.CustomerWhereInput = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { mobile: { contains: search } }, { businessName: { contains: search, mode: 'insensitive' } }] }
    : {};
  const [data, total] = await Promise.all([
    prisma.customer.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' } }),
    prisma.customer.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: 'desc' } } },
  });
  if (!customer) throw new AppError(404, 'Customer not found');
  return customer;
}

export async function createCustomer(data: Prisma.CustomerCreateInput, userId: string) {
  return prisma.customer.create({ data: { ...data, creator: { connect: { id: userId } } } });
}

export async function updateCustomer(id: string, data: Prisma.CustomerUpdateInput) {
  await getCustomer(id);
  return prisma.customer.update({ where: { id }, data });
}

export async function addNote(customerId: string, note: string, userId: string) {
  await getCustomer(customerId);
  return prisma.customerNote.create({ data: { customerId, note, createdBy: userId } });
}
```

- [ ] **Step 5: Implement `customers.controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import * as service from './customers.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listCustomers(req.query.search as string | undefined, p));
  } catch (e) { next(e); }
}
export async function get(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getCustomer(req.params.id)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createCustomer(req.body, req.user!.id)); } catch (e) { next(e); }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateCustomer(req.params.id, req.body)); } catch (e) { next(e); }
}
export async function addNote(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.addNote(req.params.id, req.body.note, req.user!.id)); } catch (e) { next(e); }
}
```

- [ ] **Step 6: Implement `customers.router.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createCustomerSchema, updateCustomerSchema, noteSchema } from './customers.schema';
import * as controller from './customers.controller';

export const customersRouter = Router();
customersRouter.use(authenticate, authorize(['sales', 'admin']));
customersRouter.get('/', controller.list);
customersRouter.post('/', validate(createCustomerSchema), controller.create);
customersRouter.get('/:id', controller.get);
customersRouter.put('/:id', validate(updateCustomerSchema), controller.update);
customersRouter.post('/:id/notes', validate(noteSchema), controller.addNote);
```

- [ ] **Step 7: Mount in `app.ts`**

```ts
import { customersRouter } from './modules/customers/customers.router';
app.use('/customers', customersRouter);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/modules/customers`
Expected: PASS (all three).

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/customers backend/src/app.ts
git commit -m "feat: add customers CRM module"
```

---

### Task 11: Products module

**Files:**
- Create: `backend/src/modules/products/products.{schema,service,controller,router}.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/modules/products/products.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let wareToken: string, salesToken: string;

beforeEach(async () => {
  await resetDb();
  const w = await prisma.user.create({ data: { name: 'W', email: 'w@erp.local', role: 'warehouse', passwordHash: await bcrypt.hash('x', 10) } });
  const s = await prisma.user.create({ data: { name: 'S', email: 's@erp.local', role: 'sales', passwordHash: await bcrypt.hash('x', 10) } });
  wareToken = signToken({ id: w.id, role: 'warehouse', email: w.email });
  salesToken = signToken({ id: s.id, role: 'sales', email: s.email });
});
afterAll(async () => { await prisma.$disconnect(); });

test('warehouse creates a product', async () => {
  const res = await request(app).post('/products').set('Authorization', `Bearer ${wareToken}`)
    .send({ name: 'Widget', sku: 'W-1', unitPrice: 10.5, currentStock: 100, minStockQty: 20 });
  expect(res.status).toBe(201);
  expect(res.body.sku).toBe('W-1');
});

test('sales can list but not create products', async () => {
  const list = await request(app).get('/products').set('Authorization', `Bearer ${salesToken}`);
  expect(list.status).toBe(200);
  const create = await request(app).post('/products').set('Authorization', `Bearer ${salesToken}`).send({ name: 'X', sku: 'X-1', unitPrice: 1 });
  expect(create.status).toBe(403);
});

test('low-stock returns products at or below min qty', async () => {
  await prisma.product.create({ data: { name: 'Low', sku: 'L-1', unitPrice: 1, currentStock: 5, minStockQty: 10 } });
  await prisma.product.create({ data: { name: 'Ok', sku: 'O-1', unitPrice: 1, currentStock: 50, minStockQty: 10 } });
  const res = await request(app).get('/products/low-stock').set('Authorization', `Bearer ${wareToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].sku).toBe('L-1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/products`
Expected: FAIL.

- [ ] **Step 3: Implement `products.schema.ts`**

```ts
import { z } from 'zod';
export const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative().optional(),
  minStockQty: z.coerce.number().int().nonnegative().optional(),
  warehouseLocation: z.string().optional(),
});
export const updateProductSchema = createProductSchema.partial().omit({ currentStock: true });
```

> `currentStock` is set only at creation; later changes go through stock movements (Task 12).

- [ ] **Step 4: Implement `products.service.ts`**

```ts
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';

export async function listProducts(search: string | undefined, p: Pagination) {
  const where: Prisma.ProductWhereInput = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] }
    : {};
  const [data, total] = await Promise.all([
    prisma.product.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' } }),
    prisma.product.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function lowStock() {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM products WHERE current_stock <= min_stock_qty ORDER BY current_stock ASC`;
  const ids = rows.map((r) => r.id);
  return prisma.product.findMany({ where: { id: { in: ids } }, orderBy: { currentStock: 'asc' } });
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(404, 'Product not found');
  return product;
}

export async function createProduct(data: Prisma.ProductCreateInput, userId: string) {
  const exists = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (exists) throw new AppError(409, 'SKU already exists');
  return prisma.product.create({ data: { ...data, creator: { connect: { id: userId } } } });
}

export async function updateProduct(id: string, data: Prisma.ProductUpdateInput) {
  await getProduct(id);
  return prisma.product.update({ where: { id }, data });
}
```

- [ ] **Step 5: Implement `products.controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import * as service from './products.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listProducts(req.query.search as string | undefined, p));
  } catch (e) { next(e); }
}
export async function lowStock(_req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.lowStock()); } catch (e) { next(e); }
}
export async function get(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getProduct(req.params.id)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createProduct(req.body, req.user!.id)); } catch (e) { next(e); }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateProduct(req.params.id, req.body)); } catch (e) { next(e); }
}
```

- [ ] **Step 6: Implement `products.router.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createProductSchema, updateProductSchema } from './products.schema';
import * as controller from './products.controller';

export const productsRouter = Router();
productsRouter.use(authenticate);
// read: all roles
productsRouter.get('/', controller.list);
productsRouter.get('/low-stock', authorize(['warehouse', 'admin']), controller.lowStock);
productsRouter.get('/:id', controller.get);
// write: warehouse + admin
productsRouter.post('/', authorize(['warehouse', 'admin']), validate(createProductSchema), controller.create);
productsRouter.put('/:id', authorize(['warehouse', 'admin']), validate(updateProductSchema), controller.update);
```

> Register `/low-stock` before `/:id` so it is not captured as an id.

- [ ] **Step 7: Mount in `app.ts`**

```ts
import { productsRouter } from './modules/products/products.router';
app.use('/products', productsRouter);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/modules/products`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/products backend/src/app.ts
git commit -m "feat: add products module with low-stock query"
```

---

### Task 12: Stock movements module

**Files:**
- Create: `backend/src/modules/stock/stock.{schema,service,controller,router}.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/modules/stock/stock.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let wareToken: string, productId: string;

beforeEach(async () => {
  await resetDb();
  const w = await prisma.user.create({ data: { name: 'W', email: 'w@erp.local', role: 'warehouse', passwordHash: await bcrypt.hash('x', 10) } });
  wareToken = signToken({ id: w.id, role: 'warehouse', email: w.email });
  const p = await prisma.product.create({ data: { name: 'Widget', sku: 'W-1', unitPrice: 1, currentStock: 50, minStockQty: 5 } });
  productId = p.id;
});
afterAll(async () => { await prisma.$disconnect(); });

const auth = () => ({ Authorization: `Bearer ${wareToken}` });

test('IN movement increases stock and logs it', async () => {
  const res = await request(app).post('/stock-movements').set(auth())
    .send({ productId, quantity: 10, type: 'in', reason: 'restock' });
  expect(res.status).toBe(201);
  const p = await prisma.product.findUnique({ where: { id: productId } });
  expect(p!.currentStock).toBe(60);
});

test('OUT movement cannot make stock negative', async () => {
  const res = await request(app).post('/stock-movements').set(auth())
    .send({ productId, quantity: 100, type: 'out', reason: 'damage' });
  expect(res.status).toBe(422);
  const p = await prisma.product.findUnique({ where: { id: productId } });
  expect(p!.currentStock).toBe(50);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/stock`
Expected: FAIL.

- [ ] **Step 3: Implement `stock.schema.ts`**

```ts
import { z } from 'zod';
export const createMovementSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  type: z.enum(['in', 'out']),
  reason: z.string().optional(),
});
```

- [ ] **Step 4: Implement `stock.service.ts`**

```ts
import { MovementType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';

// API "in"/"out" ↔ enum in_/out
const toEnum = (t: 'in' | 'out'): MovementType => (t === 'in' ? MovementType.in_ : MovementType.out);

export async function listMovements(p: Pagination, productId?: string) {
  const where = productId ? { productId } : {};
  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true, sku: true } } } }),
    prisma.stockMovement.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function createMovement(input: { productId: string; quantity: number; type: 'in' | 'out'; reason?: string }, userId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new AppError(404, 'Product not found');
    const delta = input.type === 'in' ? input.quantity : -input.quantity;
    const newStock = product.currentStock + delta;
    if (newStock < 0) throw new AppError(422, 'Insufficient stock for this movement');
    await tx.product.update({ where: { id: product.id }, data: { currentStock: newStock } });
    return tx.stockMovement.create({
      data: { productId: product.id, quantity: input.quantity, type: toEnum(input.type), reason: input.reason, createdBy: userId },
    });
  });
}
```

- [ ] **Step 5: Implement `stock.controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import * as service from './stock.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listMovements(p, req.query.productId as string | undefined));
  } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createMovement(req.body, req.user!.id)); } catch (e) { next(e); }
}
```

- [ ] **Step 6: Implement `stock.router.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createMovementSchema } from './stock.schema';
import * as controller from './stock.controller';

export const stockRouter = Router();
stockRouter.use(authenticate, authorize(['warehouse', 'admin']));
stockRouter.get('/', controller.list);
stockRouter.post('/', validate(createMovementSchema), controller.create);
```

- [ ] **Step 7: Mount in `app.ts`**

```ts
import { stockRouter } from './modules/stock/stock.router';
app.use('/stock-movements', stockRouter);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/modules/stock`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/stock backend/src/app.ts
git commit -m "feat: add stock movements with non-negative guard"
```

---

### Task 13: Challans module (with atomic confirm)

**Files:**
- Create: `backend/src/modules/challans/challans.{schema,service,controller,router}.ts`, `backend/src/lib/sequence.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/modules/challans/challans.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let salesToken: string, customerId: string, productId: string;

beforeEach(async () => {
  await resetDb();
  const s = await prisma.user.create({ data: { name: 'S', email: 's@erp.local', role: 'sales', passwordHash: await bcrypt.hash('x', 10) } });
  salesToken = signToken({ id: s.id, role: 'sales', email: s.email });
  const c = await prisma.customer.create({ data: { name: 'Acme', mobile: '111', type: 'wholesale' } });
  customerId = c.id;
  const p = await prisma.product.create({ data: { name: 'Widget', sku: 'W-1', unitPrice: 20, currentStock: 30, minStockQty: 5 } });
  productId = p.id;
});
afterAll(async () => { await prisma.$disconnect(); });

const auth = () => ({ Authorization: `Bearer ${salesToken}` });

test('creates a draft challan with product snapshot and auto number', async () => {
  const res = await request(app).post('/challans').set(auth())
    .send({ customerId, items: [{ productId, quantity: 5 }] });
  expect(res.status).toBe(201);
  expect(res.body.challanNumber).toMatch(/^CHN-/);
  expect(res.body.status).toBe('draft');
  expect(res.body.items[0].productName).toBe('Widget');
  expect(res.body.items[0].unitPrice).toBe('20');
});

test('confirming a challan reduces stock and logs OUT movements', async () => {
  const created = await request(app).post('/challans').set(auth()).send({ customerId, items: [{ productId, quantity: 10 }] });
  const res = await request(app).post(`/challans/${created.body.id}/confirm`).set(auth());
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('confirmed');
  const p = await prisma.product.findUnique({ where: { id: productId } });
  expect(p!.currentStock).toBe(20);
  const moves = await prisma.stockMovement.count({ where: { productId, type: 'out' } });
  expect(moves).toBe(1);
});

test('confirm fails with 422 when stock is insufficient', async () => {
  const created = await request(app).post('/challans').set(auth()).send({ customerId, items: [{ productId, quantity: 999 }] });
  const res = await request(app).post(`/challans/${created.body.id}/confirm`).set(auth());
  expect(res.status).toBe(422);
  const p = await prisma.product.findUnique({ where: { id: productId } });
  expect(p!.currentStock).toBe(30);
  const still = await prisma.challan.findUnique({ where: { id: created.body.id } });
  expect(still!.status).toBe('draft');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/challans`
Expected: FAIL.

- [ ] **Step 3: Implement `backend/src/lib/sequence.ts`**

```ts
// Generates human-readable document numbers: PREFIX-YYYYMMDD-XXXX
export function docNumber(prefix: string, seq: number): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}-${ymd}-${String(seq).padStart(4, '0')}`;
}
```

- [ ] **Step 4: Implement `challans.schema.ts`**

```ts
import { z } from 'zod';
export const createChallanSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().positive(),
  })).min(1),
});
export const updateChallanSchema = createChallanSchema.partial();
```

- [ ] **Step 5: Implement `challans.service.ts`**

```ts
import { Prisma, ChallanStatus, MovementType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';
import { docNumber } from '../../lib/sequence';

const withItems = { items: true, customer: { select: { name: true, businessName: true } } };

export async function listChallans(p: Pagination, status?: string) {
  const where: Prisma.ChallanWhereInput = status ? { status: status as ChallanStatus } : {};
  const [data, total] = await Promise.all([
    prisma.challan.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' }, include: withItems }),
    prisma.challan.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function getChallan(id: string) {
  const challan = await prisma.challan.findUnique({ where: { id }, include: withItems });
  if (!challan) throw new AppError(404, 'Challan not found');
  return challan;
}

export async function createChallan(input: { customerId: string; items: { productId: string; quantity: number }[] }, userId: string) {
  const products = await prisma.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) } } });
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const item of input.items) {
    if (!byId.has(item.productId)) throw new AppError(404, `Product ${item.productId} not found`);
  }
  const count = await prisma.challan.count();
  const totalQuantity = input.items.reduce((s, i) => s + i.quantity, 0);
  return prisma.challan.create({
    data: {
      challanNumber: docNumber('CHN', count + 1),
      customerId: input.customerId,
      createdBy: userId,
      totalQuantity,
      items: {
        create: input.items.map((i) => {
          const p = byId.get(i.productId)!;
          return { productId: p.id, productName: p.name, productSku: p.sku, unitPrice: p.unitPrice, quantity: i.quantity };
        }),
      },
    },
    include: withItems,
  });
}

export async function updateChallan(id: string, input: { customerId?: string; items?: { productId: string; quantity: number }[] }) {
  const challan = await getChallan(id);
  if (challan.status !== 'draft') throw new AppError(409, 'Only draft challans can be edited');
  return prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.challanItem.deleteMany({ where: { challanId: id } });
      const products = await tx.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) } } });
      const byId = new Map(products.map((p) => [p.id, p]));
      for (const i of input.items) {
        const p = byId.get(i.productId);
        if (!p) throw new AppError(404, `Product ${i.productId} not found`);
        await tx.challanItem.create({ data: { challanId: id, productId: p.id, productName: p.name, productSku: p.sku, unitPrice: p.unitPrice, quantity: i.quantity } });
      }
    }
    return tx.challan.update({
      where: { id },
      data: {
        customerId: input.customerId,
        totalQuantity: input.items ? input.items.reduce((s, i) => s + i.quantity, 0) : undefined,
      },
      include: withItems,
    });
  });
}

export async function confirmChallan(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) throw new AppError(404, 'Challan not found');
    if (challan.status !== 'draft') throw new AppError(409, 'Only draft challans can be confirmed');

    const products = await tx.product.findMany({ where: { id: { in: challan.items.map((i) => i.productId) } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const short = challan.items.filter((i) => (byId.get(i.productId)?.currentStock ?? 0) < i.quantity);
    if (short.length > 0) {
      throw new AppError(422, 'Insufficient stock', short.map((i) => ({ productId: i.productId, productName: i.productName, requested: i.quantity, available: byId.get(i.productId)?.currentStock ?? 0 })));
    }

    for (const item of challan.items) {
      await tx.product.update({ where: { id: item.productId }, data: { currentStock: { decrement: item.quantity } } });
      await tx.stockMovement.create({ data: { productId: item.productId, quantity: item.quantity, type: MovementType.out, reason: `Challan ${challan.challanNumber}`, createdBy: userId } });
    }
    return tx.challan.update({ where: { id }, data: { status: 'confirmed' }, include: withItems });
  });
}

export async function cancelChallan(id: string) {
  const challan = await getChallan(id);
  if (challan.status === 'confirmed') throw new AppError(409, 'Confirmed challans cannot be cancelled');
  return prisma.challan.update({ where: { id }, data: { status: 'cancelled' }, include: withItems });
}
```

- [ ] **Step 6: Implement `challans.controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import * as service from './challans.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listChallans(p, req.query.status as string | undefined));
  } catch (e) { next(e); }
}
export async function get(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getChallan(req.params.id)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createChallan(req.body, req.user!.id)); } catch (e) { next(e); }
}
export async function update(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updateChallan(req.params.id, req.body)); } catch (e) { next(e); }
}
export async function confirm(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.confirmChallan(req.params.id, req.user!.id)); } catch (e) { next(e); }
}
export async function cancel(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.cancelChallan(req.params.id)); } catch (e) { next(e); }
}
```

- [ ] **Step 7: Implement `challans.router.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createChallanSchema, updateChallanSchema } from './challans.schema';
import * as controller from './challans.controller';

export const challansRouter = Router();
challansRouter.use(authenticate, authorize(['sales', 'admin']));
challansRouter.get('/', controller.list);
challansRouter.post('/', validate(createChallanSchema), controller.create);
challansRouter.get('/:id', controller.get);
challansRouter.put('/:id', validate(updateChallanSchema), controller.update);
challansRouter.post('/:id/confirm', controller.confirm);
challansRouter.post('/:id/cancel', controller.cancel);
```

- [ ] **Step 8: Mount in `app.ts`**

```ts
import { challansRouter } from './modules/challans/challans.router';
app.use('/challans', challansRouter);
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx jest src/modules/challans`
Expected: PASS (all three).

- [ ] **Step 10: Commit**

```bash
git add backend/src/modules/challans backend/src/lib/sequence.ts backend/src/app.ts
git commit -m "feat: add challans with atomic stock deduction on confirm"
```

---

### Task 14: Invoices module + PDF

**Files:**
- Create: `backend/src/modules/invoices/invoices.{schema,service,controller,router}.ts`, `backend/src/lib/pdf.ts`
- Modify: `backend/src/app.ts`, `backend/package.json`
- Test: `backend/src/modules/invoices/invoices.test.ts`

- [ ] **Step 1: Install PDF lib**

Run from `backend/`: `npm i pdfkit && npm i -D @types/pdfkit`

- [ ] **Step 2: Write the failing test**

```ts
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let acctToken: string, confirmedChallanId: string;

beforeEach(async () => {
  await resetDb();
  const acct = await prisma.user.create({ data: { name: 'Ac', email: 'ac@erp.local', role: 'accounts', passwordHash: await bcrypt.hash('x', 10) } });
  acctToken = signToken({ id: acct.id, role: 'accounts', email: acct.email });
  const cust = await prisma.customer.create({ data: { name: 'Acme', mobile: '111', type: 'wholesale' } });
  const prod = await prisma.product.create({ data: { name: 'Widget', sku: 'W-1', unitPrice: 100, currentStock: 50, minStockQty: 5 } });
  const challan = await prisma.challan.create({
    data: {
      challanNumber: 'CHN-TEST-0001', customerId: cust.id, status: 'confirmed', totalQuantity: 2,
      items: { create: [{ productId: prod.id, productName: 'Widget', productSku: 'W-1', unitPrice: 100, quantity: 2 }] },
    },
  });
  confirmedChallanId = challan.id;
});
afterAll(async () => { await prisma.$disconnect(); });

const auth = () => ({ Authorization: `Bearer ${acctToken}` });

test('creates an invoice from a confirmed challan with GST math', async () => {
  const res = await request(app).post('/invoices').set(auth()).send({ challanId: confirmedChallanId });
  expect(res.status).toBe(201);
  expect(res.body.invoiceNumber).toMatch(/^INV-/);
  expect(res.body.subtotal).toBe('200');    // 2 * 100
  expect(res.body.gstAmount).toBe('36');     // 18% of 200
  expect(res.body.totalAmount).toBe('236');
});

test('rejects invoicing a non-confirmed challan', async () => {
  const draft = await prisma.challan.create({ data: { challanNumber: 'CHN-D-1', customerId: (await prisma.customer.findFirst())!.id, status: 'draft', totalQuantity: 0 } });
  const res = await request(app).post('/invoices').set(auth()).send({ challanId: draft.id });
  expect(res.status).toBe(422);
});

test('returns a PDF for an invoice', async () => {
  const created = await request(app).post('/invoices').set(auth()).send({ challanId: confirmedChallanId });
  const res = await request(app).get(`/invoices/${created.body.id}/pdf`).set(auth());
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toBe('application/pdf');
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/modules/invoices`
Expected: FAIL.

- [ ] **Step 4: Implement `invoices.schema.ts`**

```ts
import { z } from 'zod';
export const createInvoiceSchema = z.object({
  challanId: z.string().uuid(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
});
export const paymentStatusSchema = z.object({
  paymentStatus: z.enum(['unpaid', 'partial', 'paid']),
});
```

- [ ] **Step 5: Implement `invoices.service.ts`**

```ts
import { Prisma, PaymentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';
import { docNumber } from '../../lib/sequence';

const include = { challan: { include: { items: true } }, customer: true };

export async function listInvoices(p: Pagination, paymentStatus?: string) {
  const where: Prisma.InvoiceWhereInput = paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {};
  const [data, total] = await Promise.all([
    prisma.invoice.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true } } } }),
    prisma.invoice.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function getInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include });
  if (!invoice) throw new AppError(404, 'Invoice not found');
  return invoice;
}

export async function createInvoice(input: { challanId: string; gstPercent?: number }, userId: string) {
  const challan = await prisma.challan.findUnique({ where: { id: input.challanId }, include: { items: true } });
  if (!challan) throw new AppError(404, 'Challan not found');
  if (challan.status !== 'confirmed') throw new AppError(422, 'Only confirmed challans can be invoiced');
  const existing = await prisma.invoice.findUnique({ where: { challanId: challan.id } });
  if (existing) throw new AppError(409, 'Invoice already exists for this challan');

  const subtotal = challan.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const gstPercent = input.gstPercent ?? 18;
  const gstAmount = (subtotal * gstPercent) / 100;
  const totalAmount = subtotal + gstAmount;
  const count = await prisma.invoice.count();

  return prisma.invoice.create({
    data: {
      invoiceNumber: docNumber('INV', count + 1),
      challanId: challan.id,
      customerId: challan.customerId,
      subtotal, gstPercent, gstAmount, totalAmount,
      createdBy: userId,
    },
  });
}

export async function updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
  await getInvoice(id);
  return prisma.invoice.update({ where: { id }, data: { paymentStatus } });
}
```

- [ ] **Step 6: Implement `backend/src/lib/pdf.ts`**

```ts
import PDFDocument from 'pdfkit';

interface InvoicePdfData {
  invoiceNumber: string;
  createdAt: Date;
  customer: { name: string; businessName?: string | null; gstNumber?: string | null; address?: string | null };
  items: { productName: string; productSku: string; unitPrice: unknown; quantity: number }[];
  subtotal: unknown; gstPercent: unknown; gstAmount: unknown; totalAmount: unknown;
}

export function buildInvoicePdf(data: InvoicePdfData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 50 });
  doc.fontSize(20).text('INVOICE', { align: 'right' });
  doc.fontSize(10).text(`No: ${data.invoiceNumber}`, { align: 'right' });
  doc.text(`Date: ${new Date(data.createdAt).toLocaleDateString()}`, { align: 'right' });
  doc.moveDown();
  doc.fontSize(12).text('Bill To:');
  doc.fontSize(10).text(data.customer.businessName ?? data.customer.name);
  if (data.customer.gstNumber) doc.text(`GST: ${data.customer.gstNumber}`);
  if (data.customer.address) doc.text(data.customer.address);
  doc.moveDown();

  doc.fontSize(11).text('Items', { underline: true });
  data.items.forEach((i) => {
    doc.fontSize(10).text(`${i.productName} (${i.productSku})  x${i.quantity}  @ ${Number(i.unitPrice).toFixed(2)}  = ${(Number(i.unitPrice) * i.quantity).toFixed(2)}`);
  });
  doc.moveDown();
  doc.text(`Subtotal: ${Number(data.subtotal).toFixed(2)}`, { align: 'right' });
  doc.text(`GST (${Number(data.gstPercent)}%): ${Number(data.gstAmount).toFixed(2)}`, { align: 'right' });
  doc.fontSize(12).text(`Total: ${Number(data.totalAmount).toFixed(2)}`, { align: 'right' });
  doc.end();
  return doc;
}
```

- [ ] **Step 7: Implement `invoices.controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../../lib/pagination';
import { buildInvoicePdf } from '../../lib/pdf';
import * as service from './invoices.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const p = parsePagination(req.query);
    res.json(await service.listInvoices(p, req.query.paymentStatus as string | undefined));
  } catch (e) { next(e); }
}
export async function get(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.getInvoice(req.params.id)); } catch (e) { next(e); }
}
export async function create(req: Request, res: Response, next: NextFunction) {
  try { res.status(201).json(await service.createInvoice(req.body, req.user!.id)); } catch (e) { next(e); }
}
export async function updatePayment(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.updatePaymentStatus(req.params.id, req.body.paymentStatus)); } catch (e) { next(e); }
}
export async function pdf(req: Request, res: Response, next: NextFunction) {
  try {
    const invoice = await service.getInvoice(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoiceNumber}.pdf"`);
    const doc = buildInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      createdAt: invoice.createdAt,
      customer: invoice.customer,
      items: invoice.challan.items,
      subtotal: invoice.subtotal, gstPercent: invoice.gstPercent, gstAmount: invoice.gstAmount, totalAmount: invoice.totalAmount,
    });
    doc.pipe(res);
  } catch (e) { next(e); }
}
```

- [ ] **Step 8: Implement `invoices.router.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createInvoiceSchema, paymentStatusSchema } from './invoices.schema';
import * as controller from './invoices.controller';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate, authorize(['accounts', 'admin']));
invoicesRouter.get('/', controller.list);
invoicesRouter.post('/', validate(createInvoiceSchema), controller.create);
invoicesRouter.get('/:id', controller.get);
invoicesRouter.get('/:id/pdf', controller.pdf);
invoicesRouter.put('/:id/payment-status', validate(paymentStatusSchema), controller.updatePayment);
```

- [ ] **Step 9: Mount in `app.ts`**

```ts
import { invoicesRouter } from './modules/invoices/invoices.router';
app.use('/invoices', invoicesRouter);
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx jest src/modules/invoices`
Expected: PASS (all three).

- [ ] **Step 11: Commit**

```bash
git add backend/src/modules/invoices backend/src/lib/pdf.ts backend/src/app.ts backend/package.json
git commit -m "feat: add invoices module with GST calc and PDF export"
```

---

### Task 15: Dashboard endpoint

**Files:**
- Create: `backend/src/modules/dashboard/dashboard.{service,controller,router}.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/modules/dashboard/dashboard.test.ts`

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

beforeEach(async () => {
  await resetDb();
  const a = await prisma.user.create({ data: { name: 'A', email: 'a@erp.local', role: 'admin', passwordHash: await bcrypt.hash('x', 10) } });
  adminToken = signToken({ id: a.id, role: 'admin', email: a.email });
  await prisma.customer.create({ data: { name: 'C', mobile: '1', type: 'retail' } });
  await prisma.product.create({ data: { name: 'Low', sku: 'L-1', unitPrice: 1, currentStock: 2, minStockQty: 10 } });
});
afterAll(async () => { await prisma.$disconnect(); });

test('admin dashboard returns summary counts', async () => {
  const res = await request(app).get('/dashboard').set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.customerCount).toBe(1);
  expect(res.body.lowStockCount).toBe(1);
  expect(res.body).toHaveProperty('unpaidInvoiceTotal');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/modules/dashboard`
Expected: FAIL.

- [ ] **Step 3: Implement `dashboard.service.ts`**

```ts
import { prisma } from '../../lib/prisma';
import { AuthUser } from '../../types/express';

export async function summary(role: AuthUser['role']) {
  const [customerCount, productCount, lowStock, unpaid, recentChallans] = await Promise.all([
    prisma.customer.count(),
    prisma.product.count(),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::int AS count FROM products WHERE current_stock <= min_stock_qty`,
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: { in: ['unpaid', 'partial'] } } }),
    prisma.challan.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true } } } }),
  ]);

  const base = {
    customerCount,
    productCount,
    lowStockCount: Number((lowStock as any)[0]?.count ?? 0),
    unpaidInvoiceTotal: Number(unpaid._sum.totalAmount ?? 0),
    recentChallans,
  };
  return { role, ...base };
}
```

- [ ] **Step 4: Implement `dashboard.controller.ts`**

```ts
import { Request, Response, NextFunction } from 'express';
import * as service from './dashboard.service';

export async function summary(req: Request, res: Response, next: NextFunction) {
  try { res.json(await service.summary(req.user!.role)); } catch (e) { next(e); }
}
```

- [ ] **Step 5: Implement `dashboard.router.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as controller from './dashboard.controller';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get('/', controller.summary);
```

- [ ] **Step 6: Mount in `app.ts`**

```ts
import { dashboardRouter } from './modules/dashboard/dashboard.router';
app.use('/dashboard', dashboardRouter);
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest src/modules/dashboard`
Expected: PASS.

- [ ] **Step 8: Run the full backend suite**

Run: `npx jest`
Expected: all suites green. Also run `npx tsc --noEmit`.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/dashboard backend/src/app.ts
git commit -m "feat: add dashboard summary endpoint"
```

---

**Phase 2 complete.** Full backend API is functional and tested. Proceed to `03-frontend.md`.
