import {
  DashboardIcon,
  ProductsIcon,
  CategoriesIcon,
  OrdersIcon,
  CustomersIcon,
  InventoryIcon,
  BannersIcon,
  CouponsIcon,
  SettingsIcon,
} from './icons'
import type React from 'react'

export interface AdminNavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

/** Single source of truth for admin navigation — shared by the desktop
 *  sidebar, the mobile drawer, and the top bar's page-title lookup, so a
 *  route is only ever defined once. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: DashboardIcon },
  { label: 'Products', href: '/admin/products', icon: ProductsIcon },
  { label: 'Categories', href: '/admin/categories', icon: CategoriesIcon },
  { label: 'Orders', href: '/admin/orders', icon: OrdersIcon },
  { label: 'Customers', href: '/admin/customers', icon: CustomersIcon },
  { label: 'Inventory', href: '/admin/inventory', icon: InventoryIcon },
  { label: 'Banners', href: '/admin/banners', icon: BannersIcon },
  { label: 'Coupons', href: '/admin/coupons', icon: CouponsIcon },
  { label: 'Settings', href: '/admin/settings', icon: SettingsIcon },
]

/** A route is "active" for exact matches and for its own sub-routes (e.g.
 *  /admin/products/new), but /admin itself must NOT match every other admin
 *  route as a prefix. */
export function isAdminNavItemActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}
