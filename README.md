# RxPharm — Pharmacy Management System

A web-based pharmacy management system with a built-in point of sale,
built for a Lao pharmacy (one shop, two counters, with room to grow to
more branches later).

It covers day-to-day pharmacy work: selling at the counter, tracking
stock per batch with expiry dates, managing medicines, categories,
suppliers, purchases, customers and prescriptions, and reporting on
sales and stock.

This is a full-stack app in one repo: a Vue client (`src/`) and an
Express + Prisma API (`server/`), backed by PostgreSQL (hosted on
[Neon](https://neon.tech)). They're two separate projects — each has
its own `package.json` and needs its own `npm install`.

## Tech

**Client:** Vue 3 (`<script setup>` + TypeScript), Vite, Tailwind v4,
Pinia, Vue Router, vue-i18n (Lao / Thai / English), axios. Charts use
chart.js + vue-chartjs. Icons from lucide-vue-next. Light and dark
themes.

**Backend:** Node, Express, Prisma, PostgreSQL. Auth is a bcrypt
password hash + a JWT kept in an httpOnly cookie.

## Getting started

You need **both** the client and the server running, in two terminals.

```bash
# 1) Client (repo root)
npm install
npm run dev
```

```bash
# 2) Backend
cd server
npm install
```

The backend also needs a `server/.env` with a `DATABASE_URL` pointing
at a Postgres database (a free Neon project works well) plus a
`JWT_SECRET` — see `CLAUDE.md` for the full list. Then:

```bash
npm run prisma:migrate   # creates the tables
npm run prisma:seed      # adds an admin user + sample catalogue
npm run dev              # API on http://localhost:3000
```

Open http://localhost:5173. Sign in with:

```
admin@rxpharm.com  /  password
```

That account and the starter catalogue come from `server/prisma/seed.ts`
— safe to re-run any time.

## Status

**Wired to the real database:** login/session, Medicines, Categories,
Suppliers (full create/edit/deactivate, enforcing the domain rules —
e.g. you can't delete a category that still has medicines).

**Still running on sample data** (`src/data/sampleData.ts`): Dashboard,
POS, Purchases, Sales, Customers, Prescriptions, Inventory, Expiry
Tracking, Reports, Users & Staff, Notifications. Medicines from the API
report `stock: 0` for now — per-batch stock tracking (FEFO, audit log)
hasn't been built yet.

**Also done:** dark mode across the whole app; the sidebar/header/user
menu translate into Lao, Thai or English (page content is still
English-only).

**Not started:** deployment. The plan is Neon (already cloud) + a small
host (Railway/Render) for the API + Vercel/Netlify for the client.

## Contributing

If you are working on this codebase with an AI assistant, the
conventions, design system, backend structure and domain rules live in
[CLAUDE.md](CLAUDE.md). Read it before making changes.
