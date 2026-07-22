# Mini ERP + CRM Operations Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack ERP/CRM portal for a wholesale/distribution company with role-based auth, CRM, inventory, sales challans, and invoicing.

**Architecture:** Layered monolith. Express + TypeScript + Prisma backend (`routes → controller → service → prisma`), React + TypeScript (Vite) frontend, PostgreSQL. Docker Compose for local dev; Vercel + Render + Neon for deployment.

**Tech Stack:** Node.js, TypeScript, Express, Prisma, PostgreSQL, Zod, JWT, bcrypt, React 18, Vite, React Router v6, TanStack Query, React Hook Form, Tailwind CSS, `@react-pdf/renderer`, Vitest/Jest, Docker.

**Spec:** `docs/superpowers/specs/2026-07-22-erp-crm-design.md`

---

## Phase Index

Execute phases in order. Each phase file contains bite-sized, TDD-structured tasks.

| Phase | File | Produces |
|---|---|---|
| 1 | `01-backend-foundation.md` | Backend scaffold, Prisma schema, config, error handling, auth (login + JWT + RBAC middleware), user management |
| 2 | `02-backend-modules.md` | Customers, Products + stock movements, Challans (with atomic stock deduction), Invoices (+ PDF), Dashboard |
| 3 | `03-frontend.md` | React app, auth context, protected routes, shared components, all module pages |
| 4 | `04-devops.md` | Docker Compose, Dockerfiles, seed script, README, Postman collection, GitHub Actions, deployment docs |

---

## Conventions (apply throughout)

- **Language:** TypeScript everywhere, `strict: true`.
- **Testing:** Backend uses Jest + Supertest against a test Postgres schema. Frontend uses Vitest + React Testing Library. Write the failing test first, watch it fail, implement, watch it pass, commit.
- **Commits:** One commit per task (or per logical step where noted). Conventional commit prefixes (`feat:`, `test:`, `chore:`, `docs:`).
- **Validation:** Every write endpoint validates `req.body` with a Zod schema via the `validate` middleware.
- **Errors:** Services throw typed `AppError(statusCode, message, details?)`. The global `errorHandler` maps them to JSON responses.
- **Auth:** All routes except `/auth/login` and `/health` require a valid JWT. Role gates via `authorize(['admin', ...])`.
- **IDs:** UUID primary keys (`gen_random_uuid()` via Prisma `@default(uuid())`).
- **Money:** `Decimal` in Prisma; format to 2 dp at the edges.

## Definition of Done (per phase)

- All tests in the phase pass (`npm test` in the relevant package).
- `tsc --noEmit` passes.
- No hardcoded secrets; config read from env.
- Work committed with meaningful messages.

## Test Credentials (seeded in Phase 4)

| Role | Email | Password |
|---|---|---|
| Admin | admin@erp.local | Admin@123 |
| Sales | sales@erp.local | Sales@123 |
| Warehouse | warehouse@erp.local | Ware@123 |
| Accounts | accounts@erp.local | Acct@123 |
