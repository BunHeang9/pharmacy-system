# Pharmacy Management System

Web-based pharmacy management system with POS. Built for a Lao pharmacy
(1 shop, 2 counters, may expand to more branches later). Full stack:
Vue client (`src/`) + Express/Prisma API (`server/`), two separate npm
projects in this one repo.

## Stack
- Client: Vue 3 (`<script setup>` + TypeScript), Vite, Tailwind v4
- Client state: Pinia, Vue Router, axios
- Icons: lucide-vue-next
- Charts: chart.js + vue-chartjs (NOT recharts — that's React only)
- i18n: vue-i18n (Composition API, `legacy: false`). Languages: lo / th / en
- Backend (`server/`): Node + Express + Prisma + PostgreSQL (Neon), on
  `/api`. Auth is bcrypt password hash + JWT in an httpOnly cookie.

## Commands
Client (from repo root, `d:\Pharmacy`):
- `npm run dev` — Vite dev server on http://localhost:5173 (`/api` is
  proxied to Express on :3000)
- `npm run build` — type-checks with `vue-tsc -b` first, then `vite build`.
  A type error fails the build.
- `npm run preview` — serve the production build locally

Backend (from `d:\Pharmacy\server` — **a separate project**, own
`package.json`/`node_modules`/`tsconfig.json`. Don't confuse the two):
- `npm run dev` — `tsx watch src/index.ts`, API on http://localhost:3000
- `npm run build` / `npm start` — compile to `dist/` and run it (deploy only)
- `npm run prisma:migrate` — create/apply a migration after editing
  `prisma/schema.prisma`
- `npm run prisma:seed` — re-run `prisma/seed.ts` (idempotent, upserts)
- `npm run prisma:studio` — visual DB browser at http://localhost:5555

Both must be running at once for the app to work end to end.

## Rules
- Reuse components from `src/components/ui/` — do NOT create new ones
  that duplicate them (Button, Card, Modal, ConfirmModal, DataTable,
  TableRow, TableCell, Badge, StatusBadge, TextInput, SelectInput,
  SearchInput, PageHeader, SectionCard, TabsBar, FormGrid, EmptyState,
  DropdownMenu, StatCard).
- Badges: use `<StatusBadge kind="stock|expiry|payment|prescription|role" />`
- Currency is Lao Kip (₭), not USD — all money in the DB and in seed
  data is Kip-scale (no decimal subunit in practice). Never display a
  raw number or hand-roll a `$`/`.toFixed(2)` — use `src/utils/money.ts`:
  `formatMoney(n)` for stat cards/tables/inputs (₭ + thousands
  separator, no decimals), `formatCompactMoney(n)` for Chart.js axis
  ticks (k/M-suffixed, Kip amounts get large), `formatNumber(n)` when
  you need the grouped digits with no symbol. Watch for i18n templates
  that interpolate a money value (`errors.*`, `toasts.*`) — the
  template itself must not hardcode a `$`/`₭` before the placeholder;
  pass an already-`formatMoney()`-formatted string as the interpolation
  value instead, or you'll get a doubled symbol.
- **Wired to the real API:** auth, Categories, Suppliers (+ a
  `SupplierPayment` ledger against `Supplier.balance` — see **Backend
  structure**), Medicines, Inventory (stock in / out / damaged /
  expired / lost, real per-batch FEFO stock), Sales/POS (real checkout
  — server computes totals, deducts stock FEFO; POS has a customer
  picker, optional — `Sale.customerId` links to a real `Customer` when
  one is chosen), Purchases (create PENDING → receive creates batches +
  increases supplier balance), Prescriptions (create PENDING →
  Processing → Complete dispenses stock FEFO via the same helper as
  Sales, or Cancel with no stock effect), Customers (CRUD; `purchases`/
  `lastPurchase` on the list, and the profile modal's purchase history,
  are computed from real linked `Sale` rows), Users & Staff (CRUD +
  bcrypt password hashing + self-lockout guard on deactivate),
  Dashboard, Sales (invoice list/detail), Expiry Tracking, Reports (all
  four read from `GET /api/batches`, `GET /api/sales[/:id]`, and
  `GET /api/reports/summary`), and Notifications (`GET /api/notifications`
  — generated server-side from live stock/expiry/prescription state, not
  a stored event log; see **Backend structure**). No page reads from
  `sampleData.ts` for its primary data anymore. Where a server call
  belongs on a page, leave `// TODO: api.get(...)` instead of inventing
  an endpoint — check `server/src/routes/` first in case the endpoint
  already exists.
- Comments in the code are written in Lao. Keep that style.
- User-facing text goes through `t('namespace.key')`, never hardcoded.
  Add every new key to all three locale files (`en`, `lo`, `th`) — `en`
  is the fallback and must always be complete. This includes every
  `toast.show(...)` message and every caught API error — see
  **Error and toast i18n** below; never pass a raw string or a raw
  `e?.response?.data?.error` into `toast.show`.
- Design system: primary #1d6fcd, sidebar #0f1f3d, bg #f0f4f8,
  teal #0d9488. Fonts: Inter / DM Sans / Noto Sans Lao / Noto Sans Thai.
- Dark mode: class-based (`.dark` on `<html>`, `@custom-variant dark` in
  `style.css`). Any new surface/text/border colour needs a `dark:`
  variant. Convention: `bg-white`→`dark:bg-slate-800`, page
  `bg-[#f0f4f8]`→`dark:bg-slate-900`, `text-slate-800`→`dark:text-slate-100`,
  `border-slate-200`→`dark:border-slate-700`, tinted `bg-*-50`→
  `dark:bg-*-500/10`. The sidebar stays navy in both themes.
- Pages live in `src/pages/XxxView.vue` and are registered in
  `src/router/index.ts`.

## Project structure
- `src/layouts/AppLayout.vue` — the shell: sidebar + header. `NAV_GROUPS`
  in that file is where a new page gets its sidebar nav entry (pick the
  right group, give it `{ to, label, icon }`).
- `src/router/index.ts` — routes + a `beforeEach` auth guard (anything
  without `meta.public` redirects to `/login` when not logged in). New
  pages go as a child of the `AppLayout` route with a `meta.title` (the
  header breadcrumb reads it).
- `src/stores/auth.ts` — `login` / `logout` / `restore` session (Pinia).
  Currently mock; `restore()` reads `localStorage`.
- `src/stores/toast.ts` — `useToast().show(message, type)` for
  notifications (`success | error | warning | info`), auto-dismiss.
- `src/stores/cart.ts` — POS cart: line items, discounts, totals, and
  `localStorage` persistence. Totals are client-side only for now — the
  server will own them once the backend exists.
- `src/stores/notifications.ts` — `useNotifications()`: shared list +
  `unreadCount` + `load` / `markRead` / `markAllRead` / `dismiss`, all
  backed by `GET/POST/DELETE /api/notifications*`. Both the header bell
  and the Notifications page read this one store so the badge stays in
  sync; `AppLayout.vue` calls `load()` once on mount. Mutations update
  local state optimistically and roll back on a failed request.
- `src/utils/expiry.ts` — `daysUntil(dateStr)`, `expiryStatus(days)`,
  `daysLabel(days)`. Always derive expiry state from the real date here,
  never from a hard-coded day count in the data.
- `src/api/client.ts` — the shared axios instance (`baseURL: '/api'`,
  `withCredentials`, 401 → redirect to login). Use this for every
  `api.get(...)` TODO.
- `src/i18n/` — vue-i18n setup (`index.ts`) + `locales/{en,lo,th}.ts`
  message objects. Keys are namespaced (`nav.*`, `header.*`, `pages.*`,
  ...). In components use `const { t } = useI18n()` then `t('key')`.
- `src/stores/locale.ts` — `useLocale()` holds the current language.
  `setLocale(code)` updates vue-i18n, `<html lang>`, and `localStorage`
  (`'locale'` key). Default is `lo`. The header `LanguageSwitcher.vue`
  and the Settings > General language field both drive this one store.
- `src/stores/theme.ts` — `useTheme()` holds `'light' | 'dark'`.
  `toggle()` / `setTheme()` toggle `.dark` on `<html>` and persist to
  `localStorage` (`'theme'` key). A tiny inline script in `index.html`
  applies it before first paint (no flash). Header `ThemeToggle.vue`.
- `src/lib/apiError.ts` — `apiErrorMessage(err, t)`: turns a caught
  axios error into a localized string. See **Error and toast i18n**
  below.

## Error and toast i18n
Every toast and every API error a user can see must follow the selected
language (lo/th/en) — this was retrofitted across the whole app; keep it
that way for anything new.
- **Server errors**: every error response the API sends has a stable
  `code` field (e.g. `INVALID_INPUT`, `DUPLICATE_VALUE`, `NOT_FOUND`,
  `INSUFFICIENT_STOCK`, `CATEGORY_HAS_MEDICINES`, `SUPPLIER_HAS_BALANCE`,
  `PURCHASE_NOT_PENDING`, `PRESCRIPTION_ALREADY_PROCESSED`,
  `CORRECTION_REQUIRES_BATCH`, `CANNOT_DEACTIVATE_SELF`,
  `PAYMENT_EXCEEDS_BALANCE`, `NOT_AUTHENTICATED`, `INVALID_CREDENTIALS`,
  `SERVER_ERROR`) alongside
  an English `error` string (debug fallback only — never shown to the
  user). Global handler in `server/src/index.ts` sets `code` for
  Prisma's `P2002`/`P2025`; every route sets it explicitly for its own
  4xx responses. Adding a new error case in a route: pick or add a
  `code`, add the matching key under `errors.*` in all three locale
  files, and add a case for it in `apiErrorMessage()`.
- **Client**: never write `toast.show('some message', ...)` with a raw
  string, and never write `e?.response?.data?.error || 'fallback'`.
  Instead:
  - Client-triggered messages (validation, success, info) →
    `toast.show(t('toasts.<page>.<key>'), type)`. Add the key to
    `toasts.<page>.*` in all three locale files.
  - Caught API errors → `toast.show(apiErrorMessage(e, t) ||
    t('toasts.<page>.<fallbackKey>'), 'error')`. `apiErrorMessage`
    (`src/lib/apiError.ts`) maps `data.code` to `errors.<CODE>` and
    interpolates any extra fields the server sent (`field`, `available`,
    `count`, `balance`, `status`); falls back to `data.error` /
    `errors.generic` if the code is unrecognized.
  - `errors.fields.*` translates known unique-constraint field names
    (`name`, `email`, `phone`, `barcode`, `sku`) for `DUPLICATE_VALUE`;
    `errors.status.*` translates status words (`PENDING`, `RECEIVED`,
    ...) used inside `PURCHASE_NOT_PENDING` / `PRESCRIPTION_ALREADY_PROCESSED`.

## Backend structure (`server/`)
- `prisma/schema.prisma` — `Branch`, `User` (role enum, `isActive`),
  `Category`, `Supplier`, `Medicine`, `Batch`, `StockMovement` (audit
  log). IDs are `cuid()` strings, not numbers. Money fields are
  `Decimal` — the API converts them to plain numbers before sending
  JSON (see each route's `toDto`). After editing the schema:
  `npm run prisma:migrate` (asks for a migration name). On Windows, if
  `prisma generate` fails with `EPERM ... query_engine-windows.dll`,
  the dev server (`tsx watch`) has the file locked — stop it, run
  `npx prisma generate`, then `npm run dev` again.
- **Stock model**: `Medicine` has no stock column. `Batch` holds a
  quantity + expiry date per received lot; `Medicine.stock` in API
  responses is the live sum of its batches' `quantity` (computed in
  `medicines.ts`'s `toDto`, via `include: { batches: {...} }` in
  `withRels`) — `status` and `nextExpiry` are derived from that, not
  stored. `src/routes/stock.ts` is where stock actually changes:
  - `POST /api/medicines/:id/batches` — stock in; always creates a
    **new** batch (a new delivery has its own expiry).
  - `POST /api/stock-movements` — stock out / damaged / expired / lost
    / sale; deducts FEFO (earliest `expiryDate` first) across as many
    batches as needed, one `StockMovement` row per batch touched.
    `CORRECTION` instead sets one named `batchId` to an exact quantity.
  - `GET /api/batches` — every batch with `quantity > 0` across all
    medicines (medicine name + supplier name joined in), sorted
    soonest-to-expire first. Feeds Expiry Tracking, Reports' Expiry tab,
    and Dashboard — the client applies `daysUntil`/`expiryStatus` from
    `src/utils/expiry.ts` on top of it (same pattern as everywhere else:
    never store the expiry bucket, always derive it from the date).
    Expiry Tracking's "Remove" button calls `POST /api/stock-movements`
    with `type: 'EXPIRED'` and `quantity` = that batch's `qty` — safe
    because an expired batch is always the earliest-expiring one for its
    medicine, so FEFO deducts from exactly that batch.
  - Every write is a `prisma.$transaction` and creates `StockMovement`
    row(s) with `reason` + `userId` — never mutate a `Batch.quantity`
    outside this file without also writing the audit row.
- `prisma/seed.ts` — upserts a branch, the admin user
  (`admin@rxpharm.com` / `password`), and the categories/suppliers/
  medicines that used to be `sampleData.ts`. Safe to re-run.
- `src/prisma.ts` — the one shared `PrismaClient` instance.
- `src/lib/token.ts` — JWT sign/verify + the cookie name/options
  (httpOnly, `sameSite: 'lax'` in dev, `secure` only in production).
- `src/lib/asyncHandler.ts` — wrap every async route handler in this;
  Express 4 doesn't forward async throws to the error handler on its own.
- `src/middleware/auth.ts` — `requireAuth`; reads the JWT cookie, loads
  the user, sets `req.user`. Put it on any router that needs a session
  (`router.use(requireAuth)`), or per-route like `authRouter`'s `/me`.
- `src/routes/` — one file per resource (`auth.ts`, `categories.ts`,
  `suppliers.ts`, `medicines.ts`, `stock.ts`, `sales.ts`, `purchases.ts`,
  `prescriptions.ts`, `customers.ts`, `users.ts`, `reports.ts`,
  `notifications.ts`). Pattern for a new one: `Router()` + `zod` schema
  for the body + `asyncHandler` + a `toDto()` mapper that converts
  Decimals to numbers and shapes the response for the client. Mount it
  in `src/index.ts` under `/api/<name>`.
  - `sales.ts` also has `GET /api/sales/:id` (sale + its line items —
    used by the Sales page's invoice modal; the list endpoint only
    returns an item *count*, not the items themselves). Checkout
    accepts an optional `customerId`; when given, the customer's current
    `name` is looked up and snapshotted into `Sale.customerName` (same
    reasoning as `SaleItem.unitPrice` — a later rename shouldn't rewrite
    history) alongside the FK. Omit it (or send nothing) for a walk-in
    sale, same as before.
  - `customers.ts` — `purchases`/`lastPurchase` on the list are computed
    from each customer's linked `sales` (`include: { sales: { select:
    total, createdAt } } }`, reduced in `toDto`), not stored. `GET
    /api/customers/:id/sales` returns that one customer's sale history
    for the profile modal.
  - `reports.ts` — `GET /api/reports/summary?period=week|month|quarter|year`.
    Returns `totalSales`/`totalPurchases`/`grossProfit`/`txnCount` for
    the chosen period (`totalPurchases` only counts `RECEIVED` purchase
    orders — a `PENDING` one isn't a real expense yet), plus two windows
    that don't depend on `period`: `salesByDay` (last 7 calendar days,
    oldest→newest, for the weekly bar chart) and `salesByMonth` (last 6
    months, for the trend line), and `categoryShare` (sale revenue
    grouped by medicine category, within the chosen period, sorted
    descending — raw currency values, not percentages; the client
    computes `%` and assigns chart colours from its own palette, since
    the server doesn't own presentation). All money aggregation happens
    here in JS after a plain `findMany` (not Prisma `groupBy`/raw SQL) —
    fine at this data volume, and far more readable. Dashboard reuses
    this same endpoint with `period=week` for its "today" stats (today =
    the last entry in `salesByDay`) and its weekly/monthly/category
    charts, so Dashboard and Reports never disagree with each other.
  - `notifications.ts` — the `Notification` table is a *materialized
    view* of live conditions, not an event log. `GET /api/notifications`
    first calls `ensureNotifications()`, which re-derives the current
    set of low-stock/out-of-stock medicines, critical/expired/expiring
    batches, and pending prescriptions, then `upsert`s one row per
    condition keyed by a stable `key` (`stock:<medicineId>`,
    `expiry:<batchId>`, `rx:<prescriptionId>`) — the upsert's `update`
    is `{}` so an existing row's `read` state is never touched — and
    deletes the row for any key whose condition no longer holds (stock
    replenished, batch cleared, prescription no longer PENDING). Only
    then does it return the current rows. `POST /:id/read`, `POST
    /read-all`, and `DELETE /:id` (dismiss — an actual delete here, not
    the usual soft-delete, since a notification is disposable) mutate
    the persisted `read` flag / row directly. Adding a new kind of
    notification: add another `upsertNotification`/`clearNotification`
    pair inside `ensureNotifications()` with its own key prefix — don't
    hand-write rows anywhere else.
  - `suppliers.ts` — `POST /api/suppliers/:id/payments` records a
    `SupplierPayment` and decrements `Supplier.balance` by the same
    amount in one transaction; rejects (409 `PAYMENT_EXCEEDS_BALANCE`)
    if the amount is more than the current balance — there's no
    per-purchase-order allocation, payments only ever net against the
    supplier's running balance (same aggregate `balance` field that
    `POST /:id/receive` in `purchases.ts` increments). `GET
    /:id/payments` lists that supplier's payment history, newest first.
- `src/lib/fefo.ts` — `deductFefo(tx, {...})`, the shared FEFO stock
  deduction used by both `stock.ts` (manual adjustments) and `sales.ts`
  (checkout). Throws `InsufficientStockError` (caught globally in
  `index.ts` → `409`) if there isn't enough stock — always call it
  inside a `prisma.$transaction` so a failed deduction rolls back
  everything else in that request (e.g. the whole sale).
- `src/index.ts` — Express app. The error handler at the bottom turns
  Prisma's `P2002` (unique constraint) into a `409` with a readable
  message and `P2025` (not found) into `404` — don't add per-route
  try/catch for those, they're handled globally.
- Soft-delete pattern used everywhere: `DELETE /api/<resource>/:id` sets
  `isActive: false`, never removes the row. Categories/Suppliers reject
  the delete (409) if the domain rule says so (medicines still in the
  category / outstanding balance).

## Domain rules (important)
- Stock is tracked per batch with an expiry date. Selling takes from the
  batch expiring first (FEFO).
- Every stock change needs a reason and a user — it goes in an audit log.
- Never delete users, suppliers with balances, or categories that still
  have medicines. Deactivate instead.
- Never let the browser send prices; the server calculates totals.
- Design every table with `branch_id` in mind — multi-branch is coming.

## Still to do
- i18n: fully translated (lo/th/en) — app chrome, every toast and API
  error (see **Error and toast i18n** above), and all page bodies
  (titles, stat cards, table headers, buttons, form labels, tabs, modals,
  empty states). Each page's strings live under `pages.<name>.*`; shared
  words live under `common.*`; status/role/payment words shown via
  `<StatusBadge>` or a raw `<Badge>` live under one `status.*` namespace
  (`StatusBadge.vue` looks up `status.<value>` automatically — reuse that
  namespace instead of adding a new key when a page displays a status or
  role word). `TabsBar.vue` accepts either `string[]` or
  `{ value, label }[]` — pass translated `{ value, label }` pairs when
  the tab value also drives filtering logic, so the English value used
  for comparisons doesn't leak into the UI. Not translated: seed/default
  form data that represents real business content rather than UI chrome
  (e.g. `SettingsView.vue`'s default shop address and receipt footer),
  and `sampleData.ts`-sourced business data (customer names, invoice
  line items) on the pages that are still sample data.
- Dark mode: shipped across the UI kit and all pages. `LoginView.vue` is
  deliberately single-look (dark gradient) and was left out. Chart.js
  axis/grid colours are still light-tuned — pass theme-aware colours in
  when touching a chart.
- Backend milestones done: 1 (auth + catalogue), 2 (Batch/StockMovement
  + FEFO + audit log, wired to Inventory), 3 (Sales/POS checkout —
  `server/src/routes/sales.ts`, server computes totals + deducts stock
  via the shared `deductFefo` helper in `src/lib/fefo.ts`), 4 (Purchases
  — `server/src/routes/purchases.ts`, two-step create-then-receive flow;
  receiving creates batches and increments `Supplier.balance`), 5
  (Prescriptions — `server/src/routes/prescriptions.ts`, mirrors
  Purchases: create-then-complete instead of create-then-receive;
  completing dispenses stock via the same `deductFefo` helper as Sales),
  6 (Customers — `server/src/routes/customers.ts`, simple CRUD, no
  stock/status workflow), 7 (Users & Staff —
  `server/src/routes/users.ts`, CRUD + bcrypt password hashing +
  `toggle-status` with a guard against deactivating your own account),
  8 (Dashboard/Sales/Expiry Tracking/Reports — `GET /api/batches`,
  `GET /api/sales/:id`, and `server/src/routes/reports.ts`), 9
  (Notifications — `server/src/routes/notifications.ts`, derived live
  from stock/expiry/prescription state rather than a stored event log;
  POS customer-picker — `Sale.customerId`, makes Customers' purchase
  history and `GET /api/customers/:id/sales` real; Supplier payments —
  `SupplierPayment` ledger against `Supplier.balance`, `POST`/`GET
  /api/suppliers/:id/payments`; see **Backend structure** above for all
  three). Not built yet: true branch-aware queries (branch is always
  hardcoded to the seeded `'main'` branch for now via
  `req.user.branchId ?? 'main'`), and a real Sale "payment status"
  concept (there isn't one in the schema — a `Sale` row is only ever
  created once checkout succeeds, so every sale is implicitly "paid";
  don't add a `paymentStatus` filter/badge back into the Sales or
  Reports pages without adding that concept to the schema first — the
  `SupplierPayment` ledger is the *purchasing* side of accounts payable,
  it's deliberately not the same thing).
- Deployment: not done. Plan is Neon (already cloud) + Railway/Render for
  `server/` + Vercel/Netlify for the client. Will need CORS + cookie
  (`sameSite: 'none'; secure: true`) changes for cross-domain — see
  `src/lib/token.ts` and the `cors()` call in `src/index.ts`.