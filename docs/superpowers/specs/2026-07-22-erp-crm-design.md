# Mini ERP + CRM Operations Portal — Design Spec

**Date:** 2026-07-22  
**Stack:** React + TypeScript (Vite) · Express.js · Prisma · PostgreSQL (Neon) · Docker · Vercel + Render

---

## 1. Project Structure

```
yash-erp-crm/
├── backend/
│   ├── src/
│   │   ├── config/          # env, db, jwt config
│   │   ├── middleware/      # auth, errorHandler, validate
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── customers/
│   │   │   ├── products/
│   │   │   ├── challans/
│   │   │   └── invoices/
│   │   ├── lib/             # prisma client, pdf generator, s3 uploader
│   │   └── app.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/             # axios instances per module
│   │   ├── components/      # shared UI components
│   │   ├── pages/           # one folder per module
│   │   ├── hooks/           # useAuth, useCustomers, etc.
│   │   └── types/           # shared TS types mirroring backend
│   └── Dockerfile
├── docker-compose.yml       # local dev: backend + frontend + postgres
├── .github/workflows/       # CI/CD: lint/typecheck → Render + Vercel
└── README.md
```

Each module in `backend/src/modules/` contains:
- `router.ts` — Express routes with middleware applied
- `controller.ts` — request/response handling
- `service.ts` — business logic
- `schema.ts` — Zod validation schemas

---

## 2. Database Schema

### Users
```sql
users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          ENUM('admin','sales','warehouse','accounts') NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
)
```

### Customers
```sql
customers (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  mobile          TEXT NOT NULL,
  email           TEXT,
  business_name   TEXT,
  gst_number      TEXT,
  type            ENUM('retail','wholesale','distributor') NOT NULL,
  address         TEXT,
  status          ENUM('lead','active','inactive') DEFAULT 'lead',
  follow_up_date  DATE,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

customer_notes (
  id          UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

### Products & Inventory
```sql
products (
  id                UUID PRIMARY KEY,
  name              TEXT NOT NULL,
  sku               TEXT UNIQUE NOT NULL,
  category          TEXT,
  unit_price        DECIMAL(10,2) NOT NULL,
  current_stock     INTEGER DEFAULT 0,
  min_stock_qty     INTEGER DEFAULT 0,
  warehouse_location TEXT,
  image_url         TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
)

stock_movements (
  id          UUID PRIMARY KEY,
  product_id  UUID REFERENCES products(id),
  quantity    INTEGER NOT NULL,
  type        ENUM('in','out') NOT NULL,
  reason      TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

### Sales Challans
```sql
challans (
  id              UUID PRIMARY KEY,
  challan_number  TEXT UNIQUE NOT NULL,  -- auto-generated: CHN-YYYYMMDD-XXXX
  customer_id     UUID REFERENCES customers(id),
  status          ENUM('draft','confirmed','cancelled') DEFAULT 'draft',
  total_quantity  INTEGER DEFAULT 0,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
)

challan_items (
  id            UUID PRIMARY KEY,
  challan_id    UUID REFERENCES challans(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  product_name  TEXT NOT NULL,   -- snapshot at creation time
  product_sku   TEXT NOT NULL,   -- snapshot at creation time
  unit_price    DECIMAL(10,2) NOT NULL,  -- snapshot at creation time
  quantity      INTEGER NOT NULL
)
```

### Invoices
```sql
invoices (
  id              UUID PRIMARY KEY,
  invoice_number  TEXT UNIQUE NOT NULL,  -- auto-generated: INV-YYYYMMDD-XXXX
  challan_id      UUID UNIQUE REFERENCES challans(id),  -- 1:1
  customer_id     UUID REFERENCES customers(id),
  subtotal        DECIMAL(10,2) NOT NULL,
  gst_percent     DECIMAL(5,2) DEFAULT 18,
  gst_amount      DECIMAL(10,2) NOT NULL,
  total_amount    DECIMAL(10,2) NOT NULL,
  payment_status  ENUM('unpaid','partial','paid') DEFAULT 'unpaid',
  pdf_url         TEXT,  -- null unless S3 bonus is implemented; PDF generated on-the-fly otherwise
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

**Key design decisions:**
- `challan_items` stores product name/sku/price as snapshots — product edits don't affect historical challans
- `current_stock` on `products` is the live count; `stock_movements` is the audit log
- Invoice is 1:1 with challan; only confirmed challans can be invoiced

---

## 3. Backend Architecture

**Request flow:** `Router → Middleware (auth → authorize → validate) → Controller → Service → Prisma → DB`

### Middleware
| Middleware | Purpose |
|---|---|
| `authenticate` | Verifies JWT, attaches `req.user` |
| `authorize(roles[])` | Role-gates routes; 403 if not in allowed list |
| `validate(schema)` | Zod validation on `req.body`; 400 with field errors |
| `errorHandler` | Global catch-all; maps known errors to HTTP codes |

### API Routes

```
POST   /auth/login
POST   /auth/logout

GET    /users                    (admin)
POST   /users                    (admin)

GET    /customers                (sales, admin) — paginated, search by name/mobile
POST   /customers                (sales, admin)
GET    /customers/:id            (sales, admin)
PUT    /customers/:id            (sales, admin)
POST   /customers/:id/notes      (sales, admin)

GET    /products                 (all roles) — paginated, search by name/sku
POST   /products                 (warehouse, admin)
PUT    /products/:id             (warehouse, admin)
POST   /products/:id/image       (warehouse, admin) — S3 upload [bonus]
GET    /products/low-stock       (warehouse, admin)

GET    /stock-movements          (warehouse, admin) — paginated
POST   /stock-movements          (warehouse, admin) — manual IN/OUT

GET    /challans                 (sales, admin) — paginated, filterable by status
POST   /challans                 (sales, admin)
GET    /challans/:id             (sales, admin)
PUT    /challans/:id             (sales, admin) — draft only
POST   /challans/:id/confirm     (sales, admin) — triggers stock deduction
POST   /challans/:id/cancel      (sales, admin)

GET    /invoices                 (accounts, admin) — paginated, filterable by payment_status
POST   /invoices                 (accounts, admin) — body: { challan_id }
GET    /invoices/:id             (accounts, admin)
GET    /invoices/:id/pdf         (accounts, admin) — generates and streams PDF
PUT    /invoices/:id/payment-status (accounts, admin)

GET    /dashboard                (all roles) — role-filtered summary stats
```

### Critical Business Logic — Challan Confirm

Runs inside a Prisma `$transaction`:
1. Fetch all `challan_items` with current product stock
2. If any item's quantity > `current_stock` → rollback, return **422** with list of short products
3. For each item: decrement `products.current_stock`, insert `stock_movements` record (type: `out`)
4. Set `challan.status = 'confirmed'`

Stock can never go negative — enforced at the service layer, not just DB constraint.

---

## 4. Frontend Architecture

**Dependencies:** React 18, TypeScript, Vite, React Router v6, Axios, TanStack Query (React Query), React Hook Form + Zod, Tailwind CSS, `@react-pdf/renderer`

### Routes & Role Access

| Route | Roles |
|---|---|
| `/login` | public |
| `/dashboard` | all |
| `/customers` | sales, admin |
| `/customers/:id` | sales, admin |
| `/products` | all |
| `/stock-movements` | warehouse, admin |
| `/challans` | sales, admin |
| `/challans/:id` | sales, admin |
| `/invoices` | accounts, admin |
| `/invoices/:id` | accounts, admin |
| `/users` | admin |

`<ProtectedRoute roles={[...]}>` wraps all authenticated routes — checks JWT expiry and role, redirects to `/login` or `/dashboard` accordingly.

### State Management
- **TanStack Query** — all server state (fetch, cache, invalidate on mutation)
- **AuthContext** — current user, role, token (persisted to `localStorage`)
- No additional global state library

### Shared Components
| Component | Usage |
|---|---|
| `<DataTable>` | Paginated, searchable table — used on every list page |
| `<FormModal>` | Add/edit modal with React Hook Form |
| `<StatusBadge>` | Colored badge for status fields |
| `<PageHeader>` | Title + action button row |
| `<LowStockBanner>` | Warning strip on Products page and dashboard |

### Dashboard (role-filtered)
- **Admin:** customer count, total products, low stock count, pending invoice total, recent challans
- **Sales:** today's challans, active customer count, recent follow-ups due
- **Warehouse:** low stock alerts, recent stock movements
- **Accounts:** unpaid invoices total, invoices created this month

---

## 5. Deployment & DevOps

### Production
| Layer | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploy from `main` |
| Backend | Render | Node web service, auto-deploy from `main` |
| Database | Neon | Serverless Postgres, free tier |
| File storage | AWS S3 | Bonus — product images only |

### Local Development
Docker Compose runs three services:
- `postgres` — mirrors Neon schema locally
- `backend` — Express on `:3000` with `ts-node-dev` hot reload
- `frontend` — Vite on `:5173`

Single command to start: `docker compose up`

### GitHub Actions (Bonus)
On push to `main`:
1. Type-check (`tsc --noEmit`) on backend and frontend
2. Lint (ESLint)
3. Render and Vercel handle their own deploy triggers via GitHub integration

### Environment Variables

**Backend:**
```
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN=7d
FRONTEND_URL
AWS_ACCESS_KEY_ID       # bonus
AWS_SECRET_ACCESS_KEY   # bonus
AWS_S3_BUCKET           # bonus
```

**Frontend:**
```
VITE_API_URL
```

---

## 6. Modules Summary

| Module | Owner Roles | Key Features |
|---|---|---|
| Auth | — | JWT login, admin-created users, role-based access |
| Customers (CRM) | sales, admin | CRUD, search, follow-up notes, status tracking |
| Products & Inventory | warehouse, admin | CRUD, stock movements log, low-stock alerts, image upload (bonus) |
| Sales Challans | sales, admin | Draft/confirm/cancel flow, atomic stock deduction, product snapshots |
| Invoices | accounts, admin | Create from challan, GST calc, payment status, PDF export |
| Dashboard | all | Role-filtered summary cards |
| User Management | admin | Create users, assign roles |

---

## 7. Bonus Features

| Feature | Implementation |
|---|---|
| Docker local dev | `docker-compose.yml` with postgres + backend + frontend |
| GitHub Actions CI/CD | Lint + typecheck gate before Render/Vercel deploy |
| Invoice PDF export | `@react-pdf/renderer` on frontend; streamed from `GET /invoices/:id/pdf` |
| Product image upload | Multer + AWS S3 SDK on `POST /products/:id/image` |

---

## 8. Submission Checklist

- [ ] GitHub repository with meaningful commits
- [ ] Live frontend URL (Vercel)
- [ ] Live backend API URL (Render)
- [ ] Test credentials for all 4 roles (admin, sales, warehouse, accounts)
- [ ] Postman collection exported to `/postman/erp-crm.postman_collection.json`
- [ ] README with local setup, Docker setup, deployment steps, architecture summary
- [ ] Known limitations documented
