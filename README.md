# Mini ERP + CRM Operations Portal

Full-stack ERP/CRM for a wholesale/distribution company: role-based auth, customer CRM, product & inventory, sales challans with stock control, and GST invoices with PDF export.

## Tech Stack
- **Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, Zod, JWT
- **Frontend:** React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS
- **Infra:** Docker Compose (local), Vercel + Render + Neon (deploy)

## Architecture
Layered monolith. Backend requests flow `router -> middleware (auth -> authorize -> validate) -> controller -> service -> Prisma -> PostgreSQL`. Each domain lives under `backend/src/modules/<name>` with its own router/controller/service/schema. Frontend is a role-guarded SPA using TanStack Query for all server state and an `AuthContext` (JWT persisted to localStorage). See `docs/superpowers/specs/2026-07-22-erp-crm-design.md`.

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

## Run Locally (Docker - recommended)
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
cd frontend && npm test       # Vitest + React Testing Library
```
The backend test suite runs serially (`jest --runInBand`) against a dedicated `erp_crm_test` database.

## Deployment

### Database - Neon
1. Create a project at neon.tech, copy the pooled connection string.
2. Use it as `DATABASE_URL` on the backend host.
3. Run `npx prisma migrate deploy` and `npx prisma db seed` once (locally pointed at Neon, or via the backend host shell).

### Backend - Render
1. New -> Web Service -> connect the GitHub repo, root `backend/`.
2. Build: `npm install && npx prisma generate && npm run build`. Start: `npx prisma migrate deploy && node dist/server.js`.
3. Set env vars: `DATABASE_URL` (Neon), `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL` (the Vercel URL).

### Frontend - Vercel
1. New Project -> import the repo, root `frontend/`.
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

## API Overview
- `POST /auth/login`
- `GET/POST /users` (admin)
- `GET/POST /customers`, `GET/PUT /customers/:id`, `POST /customers/:id/notes`
- `GET/POST /products`, `PUT /products/:id`, `GET /products/low-stock`
- `GET/POST /stock-movements`
- `GET/POST /challans`, `GET/PUT /challans/:id`, `POST /challans/:id/confirm`, `POST /challans/:id/cancel`
- `GET/POST /invoices`, `GET /invoices/:id`, `GET /invoices/:id/pdf`, `PUT /invoices/:id/payment-status`
- `GET /dashboard`

A Postman collection is provided at `postman/erp-crm.postman_collection.json`.
