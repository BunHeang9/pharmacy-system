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


## Project Scope
Manage Basic Data
- Manage medicine information, including name, generic name, brand, form, strength, barcode, prices, and minimum stock level
- Manage medicine categories
- Manage suppliers
- Manage customer information
- Manage user accounts, staff roles, and access permissions
- Manage pharmacy settings, including shop details, currency, tax, and alert preferences
Sales and Point of Sale
- Search for and select medicines for a sale
- Enter medicine quantities and calculate the sale total
- Select a customer or record a walk-in sale
- Select a payment method
- Save and view sales records
- Generate or print receipts
Purchasing and Suppliers
- Create and manage purchase orders
- Select a supplier and add medicines to an order
- Record purchase quantities, costs, batch numbers, and expiry dates
- Track purchase order status
- Record payments to suppliers
Inventory and Expiry Management
- Track medicine stock by batch and branch
- Record stock received, sold, damaged, expired, lost, or corrected
- View current stock levels
- Identify low-stock medicines
- Track medicine expiry dates and show upcoming expiry alerts
- Maintain a history of stock movements
Prescription Management
- Record prescription and patient details
- Add prescribed medicines and dosage instructions
- Track prescription status
- Record the pharmacist responsible for processing a prescription
Customer Management
- Add and update customer information
- View customer purchase history
- Manage customer discounts
Staff and Access Management
- Manage staff accounts and roles
- Restrict system access according to user roles
- Track staff actions where audit logging is available
Expenses and Notifications
- Record pharmacy expenses by category
- View expense records
- Show alerts for low stock, upcoming expiry dates, and pending prescriptions
Reports
- View sales reports
- View inventory and stock movement reports
- View medicine expiry and low-stock reports
- View purchase and supplier reports
- View expense reports
- View dashboard summaries and sales statistics
System Features
- Support Lao, Thai, and English interface options
- Provide light and dark display themes
- Support pharmacy operations for a shop, with the system designed to allow future expansion to multiple branches
Current implementation note: Login, medicine, category, and supplier management are connected to the database. The README indicates that several other areas still use sample data, and batch-based stock tracking is not yet implemented.

## Medicine image uploads

Medicine images can be selected from a device as JPEG, PNG, or WebP files up to 5 MB. The API saves them under `UPLOAD_DIR/medicines` and stores their `/uploads/medicines/...` path in PostgreSQL. For Railway, attach a persistent volume mounted at `/data` and set `UPLOAD_DIR=/data/uploads`. The Cloudflare Worker must proxy `/uploads/` requests to the Railway API so deployed clients can view the files. Images saved before persistent storage is configured must be uploaded again.
