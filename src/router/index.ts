import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/pages/LoginView.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      component: AppLayout,
      children: [
        { path: "", redirect: "/dashboard" },
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/pages/DashboardView.vue"),
          meta: { title: "Dashboard" },
        },
        {
          path: "pos",
          name: "pos",
          component: () => import("@/pages/PosView.vue"),
          meta: { title: "Point of Sale" },
        },
        {
          path: "medicines",
          name: "medicines",
          component: () => import("@/pages/MedicinesView.vue"),
          meta: { title: "Medicines" },
        },
        {
          path: "categories",
          name: "categories",
          component: () => import("@/pages/CategoriesView.vue"),
          meta: { title: "Categories" },
        },
        {
          path: "suppliers",
          name: "suppliers",
          component: () => import("@/pages/SuppliersView.vue"),
          meta: { title: "Suppliers" },
        },
        {
          path: "purchases",
          name: "purchases",
          component: () => import("@/pages/PurchasesView.vue"),
          meta: { title: "Purchases" },
        },
        {
          path: "sales",
          name: "sales",
          component: () => import("@/pages/SalesView.vue"),
          meta: { title: "Sales" },
        },
        {
          path: "customers",
          name: "customers",
          component: () => import("@/pages/CustomersView.vue"),
          meta: { title: "Customers" },
        },
        {
          path: "prescriptions",
          name: "prescriptions",
          component: () => import("@/pages/PrescriptionsView.vue"),
          meta: { title: "Prescriptions" },
        },
        {
          path: "inventory",
          name: "inventory",
          component: () => import("@/pages/InventoryView.vue"),
          meta: { title: "Inventory" },
        },
        {
          path: "expiry",
          name: "expiry",
          component: () => import("@/pages/ExpiryView.vue"),
          meta: { title: "Expiry Tracking" },
        },
        {
          path: "reports",
          name: "reports",
          component: () => import("@/pages/ReportsView.vue"),
          meta: { title: "Reports" },
        },
        {
          path: "users",
          name: "users",
          component: () => import("@/pages/UsersView.vue"),
          meta: { title: "Users & Staff" },
        },
        {
          path: "settings",
          name: "settings",
          component: () => import("@/pages/SettingsView.vue"),
          meta: { title: "Settings" },
        },
        {
          path: "notifications",
          name: "notifications",
          component: () => import("@/pages/NotificationsView.vue"),
          meta: { title: "Notifications" },
        },
        {
          path: "expenses",
          name: "expenses",
          component: () => import("@/pages/ExpensesView.vue"),
          meta: { title: "Expenses" },
        },
        {
          path: "audit-log",
          name: "auditLog",
          component: () => import("@/pages/AuditLogView.vue"),
          meta: { title: "Audit Log" },
        },
      ],
    },
  ],
});

// ໜ້າທີ່ Pharmacy Clerk ເຂົ້າບໍ່ໄດ້ — ຄືກັນກັບ CLERK_HIDDEN_PATHS ໃນ AppLayout.vue (backend ກັນໄວ້ແລ້ວ, ນີ້ແມ່ນເສີມ UX)
const CLERK_BLOCKED_ROUTES = ['categories', 'suppliers', 'purchases', 'prescriptions', 'reports', 'expenses', 'users', 'settings']

// ກູ້ session ຈາກ cookie ຄັ້ງດຽວ ກ່ອນ navigation ທຳອິດ
let sessionRestored = false

// ປ້ອງກັນບໍ່ໃຫ້ເຂົ້າໜ້າອື່ນຖ້າຍັງບໍ່ login
router.beforeEach(async (to) => {
  const auth = useAuth()
  if (!sessionRestored) {
    sessionRestored = true
    await auth.restore()
  }
  if (!to.meta.public && !auth.user) return { name: 'login' }
  if (auth.user?.role === 'PHARMACY_CLERK' && CLERK_BLOCKED_ROUTES.includes(to.name as string)) return { name: 'dashboard' }
  if (to.name === 'auditLog' && auth.user?.role !== 'SUPER_ADMIN') return { name: 'dashboard' }
  if (to.name === 'login' && auth.user) return { name: 'dashboard' }
})


export default router
