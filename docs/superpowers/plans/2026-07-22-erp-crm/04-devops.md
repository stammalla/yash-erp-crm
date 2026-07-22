# Phase 4 — DevOps, Seed, Docs & Deployment

**Produces:** Prisma seed, Docker Compose + Dockerfiles, README, Postman collection, GitHub Actions, deployment docs. Includes the S3 image-upload bonus as an optional task.

Prerequisite: Phases 1–3 complete.

---

### Task 28: Database seed script

**Files:**
- Create: `backend/prisma/seed.ts`

- [ ] **Step 1: Implement `backend/prisma/seed.ts`**

```ts
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: 'Admin User', email: 'admin@erp.local', role: 'admin' as const, password: 'Admin@123' },
    { name: 'Sales User', email: 'sales@erp.local', role: 'sales' as const, password: 'Sales@123' },
    { name: 'Warehouse User', email: 'warehouse@erp.local', role: 'warehouse' as const, password: 'Ware@123' },
    { name: 'Accounts User', email: 'accounts@erp.local', role: 'accounts' as const, password: 'Acct@123' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, role: u.role, passwordHash: await bcrypt.hash(u.password, 10) },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@erp.local' } });

  // Sample customers
  await prisma.customer.createMany({
    data: [
      { name: 'Acme Traders', mobile: '9990001111', type: 'wholesale', status: 'active', businessName: 'Acme Traders Pvt Ltd', gstNumber: '29ABCDE1234F1Z5', createdBy: admin.id },
      { name: 'Bharat Retail', mobile: '9990002222', type: 'retail', status: 'lead', createdBy: admin.id },
    ],
    skipDuplicates: true,
  });

  // Sample products
  await prisma.product.createMany({
    data: [
      { name: 'Steel Bolt M8', sku: 'SB-M8', category: 'Fasteners', unitPrice: 2.5, currentStock: 500, minStockQty: 100, warehouseLocation: 'A1', createdBy: admin.id },
      { name: 'Copper Wire 2mm', sku: 'CW-2MM', category: 'Electrical', unitPrice: 45.0, currentStock: 30, minStockQty: 50, warehouseLocation: 'B2', createdBy: admin.id },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete. Login with the credentials in the README.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run the seed**

Run from `backend/`: `npx prisma db seed` — first add to `package.json`:
```json
"prisma": { "seed": "ts-node-dev --transpile-only prisma/seed.ts" }
```
Expected: "Seed complete." and 4 users created.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/seed.ts backend/package.json
git commit -m "feat: add database seed with test users and sample data"
```

---

### Task 29: Dockerfiles + Docker Compose

**Files:**
- Create: `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `docker-compose.yml`, `.dockerignore` (both packages)

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

- [ ] **Step 2: Create `backend/.dockerignore`**

```
node_modules
dist
.env
```

- [ ] **Step 3: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 4: Create `frontend/nginx.conf`**

```
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }
}
```

- [ ] **Step 5: Create `frontend/.dockerignore`**

```
node_modules
dist
.env
```

- [ ] **Step 6: Create `docker-compose.yml` at repo root**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: erp_crm
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/erp_crm?schema=public
      JWT_SECRET: local-dev-secret
      JWT_EXPIRES_IN: 7d
      PORT: 3000
      FRONTEND_URL: http://localhost:8080
    ports:
      - "3000:3000"

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: http://localhost:3000
    depends_on:
      - backend
    ports:
      - "8080:80"

volumes:
  pgdata:
```

- [ ] **Step 7: Verify the full stack boots**

Run from repo root: `docker compose up --build`
Then seed once: `docker compose exec backend npx prisma db seed`
Open `http://localhost:8080`, log in as admin@erp.local / Admin@123.
Expected: dashboard loads.

- [ ] **Step 8: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore frontend/Dockerfile frontend/.dockerignore frontend/nginx.conf docker-compose.yml
git commit -m "chore: add dockerfiles and docker-compose for local stack"
```

---

### Task 30: Postman collection

**Files:**
- Create: `postman/erp-crm.postman_collection.json`

- [ ] **Step 1: Create `postman/erp-crm.postman_collection.json`**

```json
{
  "info": { "name": "ERP CRM", "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000" },
    { "key": "token", "value": "" }
  ],
  "item": [
    {
      "name": "Auth - Login",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": "{{baseUrl}}/auth/login",
        "body": { "mode": "raw", "raw": "{\n  \"email\": \"admin@erp.local\",\n  \"password\": \"Admin@123\"\n}" }
      },
      "event": [{
        "listen": "test",
        "script": { "exec": ["pm.collectionVariables.set('token', pm.response.json().token);"] }
      }]
    },
    {
      "name": "Customers - List",
      "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/customers?page=1&limit=10" }
    },
    {
      "name": "Customers - Create",
      "request": {
        "method": "POST",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }, { "key": "Content-Type", "value": "application/json" }],
        "url": "{{baseUrl}}/customers",
        "body": { "mode": "raw", "raw": "{\n  \"name\": \"New Co\",\n  \"mobile\": \"9998887777\",\n  \"type\": \"wholesale\"\n}" }
      }
    },
    {
      "name": "Products - List",
      "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/products?page=1&limit=10" }
    },
    {
      "name": "Products - Create",
      "request": {
        "method": "POST",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }, { "key": "Content-Type", "value": "application/json" }],
        "url": "{{baseUrl}}/products",
        "body": { "mode": "raw", "raw": "{\n  \"name\": \"New Product\",\n  \"sku\": \"NP-1\",\n  \"unitPrice\": 10,\n  \"currentStock\": 100,\n  \"minStockQty\": 10\n}" }
      }
    },
    {
      "name": "Stock - Create Movement",
      "request": {
        "method": "POST",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }, { "key": "Content-Type", "value": "application/json" }],
        "url": "{{baseUrl}}/stock-movements",
        "body": { "mode": "raw", "raw": "{\n  \"productId\": \"REPLACE\",\n  \"quantity\": 10,\n  \"type\": \"in\",\n  \"reason\": \"restock\"\n}" }
      }
    },
    {
      "name": "Challans - Create",
      "request": {
        "method": "POST",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }, { "key": "Content-Type", "value": "application/json" }],
        "url": "{{baseUrl}}/challans",
        "body": { "mode": "raw", "raw": "{\n  \"customerId\": \"REPLACE\",\n  \"items\": [{ \"productId\": \"REPLACE\", \"quantity\": 2 }]\n}" }
      }
    },
    {
      "name": "Challans - Confirm",
      "request": { "method": "POST", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/challans/REPLACE/confirm" }
    },
    {
      "name": "Invoices - Create",
      "request": {
        "method": "POST",
        "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }, { "key": "Content-Type", "value": "application/json" }],
        "url": "{{baseUrl}}/invoices",
        "body": { "mode": "raw", "raw": "{\n  \"challanId\": \"REPLACE\"\n}" }
      }
    },
    {
      "name": "Invoices - PDF",
      "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/invoices/REPLACE/pdf" }
    },
    {
      "name": "Dashboard",
      "request": { "method": "GET", "header": [{ "key": "Authorization", "value": "Bearer {{token}}" }], "url": "{{baseUrl}}/dashboard" }
    }
  ]
}
```

- [ ] **Step 2: Verify import**

Import into Postman, run "Auth - Login" (token auto-saved), then run the others.

- [ ] **Step 3: Commit**

```bash
git add postman/erp-crm.postman_collection.json
git commit -m "docs: add postman collection"
```

---

### Task 31: README

**Files:**
- Create: `README.md` at repo root

- [ ] **Step 1: Write `README.md`**

```markdown
# Mini ERP + CRM Operations Portal

Full-stack ERP/CRM for a wholesale/distribution company: role-based auth, customer CRM, product & inventory, sales challans with stock control, and GST invoices with PDF export.

## Tech Stack
- **Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, Zod, JWT
- **Frontend:** React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS
- **Infra:** Docker Compose (local), Vercel + Render + Neon (deploy)

## Architecture
Layered monolith. Backend requests flow `router → middleware (auth → authorize → validate) → controller → service → Prisma → PostgreSQL`. Each domain lives under `backend/src/modules/<name>` with its own router/controller/service/schema. Frontend is a role-guarded SPA using TanStack Query for all server state and an `AuthContext` (JWT persisted to localStorage). See `docs/superpowers/specs/2026-07-22-erp-crm-design.md`.

## Roles
| Role | Access |
|---|---|
| Admin | Everything + user management |
| Sales | Customers, Challans |
| Warehouse | Products, Stock movements |
| Accounts | Invoices |

## Test Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@erp.local | Admin@123 |
| Sales | sales@erp.local | Sales@123 |
| Warehouse | warehouse@erp.local | Ware@123 |
| Accounts | accounts@erp.local | Acct@123 |

## Run Locally (Docker — recommended)
```bash
docker compose up --build
docker compose exec backend npx prisma db seed
```
- Frontend: http://localhost:8080
- API: http://localhost:3000

## Run Locally (manual)
Prereqs: Node 20+, PostgreSQL running.

**Backend**
```bash
cd backend
cp .env.example .env          # set DATABASE_URL, JWT_SECRET
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                   # http://localhost:3000
```

**Frontend**
```bash
cd frontend
cp .env.example .env          # set VITE_API_URL=http://localhost:3000
npm install
npm run dev                   # http://localhost:5173
```

## Environment Variables
**Backend** (`backend/.env`)
| Var | Purpose |
|---|---|
| DATABASE_URL | Postgres connection string |
| JWT_SECRET | Signing secret |
| JWT_EXPIRES_IN | Token TTL (e.g. 7d) |
| FRONTEND_URL | CORS origin |
| AWS_* | S3 image upload (optional bonus) |

**Frontend** (`frontend/.env`)
| Var | Purpose |
|---|---|
| VITE_API_URL | Backend base URL |

Never commit real `.env` files; only `.env.example` is tracked.

## Tests
```bash
cd backend && npm test        # Jest + Supertest (needs a test Postgres DB)
cd frontend && npm test       # Vitest + RTL
```

## Deployment

### Database — Neon
1. Create a project at neon.tech, copy the pooled connection string.
2. Use it as `DATABASE_URL` on the backend host.
3. Run `npx prisma migrate deploy` and `npx prisma db seed` once (locally pointed at Neon, or via the backend host shell).

### Backend — Render
1. New → Web Service → connect the GitHub repo, root `backend/`.
2. Build: `npm install && npx prisma generate && npm run build`. Start: `npx prisma migrate deploy && node dist/server.js`.
3. Set env vars: `DATABASE_URL` (Neon), `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL` (the Vercel URL).

### Frontend — Vercel
1. New Project → import the repo, root `frontend/`.
2. Framework: Vite. Set env var `VITE_API_URL` to the Render backend URL.
3. Deploy; update the backend's `FRONTEND_URL` to the Vercel domain for CORS.

## Assumptions
- One invoice per confirmed challan (1:1); confirmed challans cannot be edited or cancelled.
- `currentStock` is set at product creation; all later changes go through stock movements or challan confirmation.
- GST defaults to 18% and is applied on the invoice subtotal.
- Users are created by an Admin; there is no public signup.

## Known Limitations
- No refresh-token rotation; JWT expiry only.
- Invoice PDF is generated on the fly (not persisted) unless the S3 bonus is enabled.
- No soft deletes; records are updated in place.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add project README with setup and deployment"
```

---

### Task 32: GitHub Actions CI (bonus)

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres, POSTGRES_DB: erp_crm_test }
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
    defaults: { run: { working-directory: backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: backend/package-lock.json }
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
        env: { DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_crm_test?schema=public }
      - run: npx tsc --noEmit
      - run: npm test
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/erp_crm_test?schema=public
          JWT_SECRET: ci-secret

  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: frontend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: frontend/package-lock.json }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add github actions for backend and frontend"
```

---

### Task 33 (BONUS, optional): S3 product image upload

Skip unless time permits and AWS credentials are available.

**Files:**
- Create: `backend/src/lib/s3.ts`, add handler to products module
- Modify: `backend/src/modules/products/products.router.ts`, `products.controller.ts`, `backend/package.json`

- [ ] **Step 1: Install deps**

Run from `backend/`: `npm i @aws-sdk/client-s3 multer && npm i -D @types/multer`

- [ ] **Step 2: Implement `backend/src/lib/s3.ts`**

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function uploadImage(buffer: Buffer, mimetype: string): Promise<string> {
  const key = `products/${randomUUID()}`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }));
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
```

- [ ] **Step 3: Add controller handler in `products.controller.ts`**

```ts
import { uploadImage } from '../../lib/s3';
import { updateProduct } from './products.service';

export async function uploadProductImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError(400, 'No image uploaded');
    const url = await uploadImage(req.file.buffer, req.file.mimetype);
    res.json(await updateProduct(req.params.id, { imageUrl: url }));
  } catch (e) { next(e); }
}
```
(Add `import { AppError } from '../../lib/AppError';` and `Request, Response, NextFunction` if not present.)

- [ ] **Step 4: Wire route in `products.router.ts`**

```ts
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });
productsRouter.post('/:id/image', authorize(['warehouse', 'admin']), upload.single('image'), controller.uploadProductImage);
```

- [ ] **Step 5: Manual verification**

With AWS env vars set, POST an image (form-data key `image`) to `/products/:id/image`. Expect the product returned with an `imageUrl`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/s3.ts backend/src/modules/products backend/package.json
git commit -m "feat: add S3 product image upload (bonus)"
```

---

**Phase 4 complete.** The project is deployable and documented.

## Final Verification Checklist
- [ ] `cd backend && npx jest` — all green
- [ ] `cd backend && npx tsc --noEmit` — clean
- [ ] `cd frontend && npx vitest run` — all green
- [ ] `cd frontend && npx tsc --noEmit` — clean
- [ ] `docker compose up --build` boots the full stack; seed runs; login works for all 4 roles
- [ ] Full flow: create customer → create product → create challan → confirm (stock drops) → create invoice → download PDF
- [ ] Deployed URLs live (Vercel + Render + Neon) OR screen recording + Postman collection provided
- [ ] README complete with credentials, setup, deployment, assumptions, limitations
