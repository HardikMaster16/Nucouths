'use client'

import React from 'react'
import type { StoreSettings, StorefrontSettings, OrderSettings, PaymentStatusRow } from '@/lib/admin/settings'
import { StoreSettingsSection } from './StoreSettingsSection'
import { StorefrontSettingsSection } from './StorefrontSettingsSection'
import { OrderSettingsSection } from './OrderSettingsSection'
import { PaymentStatusSection } from './PaymentStatusSection'

interface AdminSettingsClientProps {
  seedStore: StoreSettings
  seedStorefront: StorefrontSettings
  seedOrder: OrderSettings
  paymentRows: PaymentStatusRow[]
}

export function AdminSettingsClient({ seedStore, seedStorefront, seedOrder, paymentRows }: AdminSettingsClientProps) {
  return (
    <div className="flex flex-col gap-6">
      <StoreSettingsSection initialValues={seedStore} />
      <StorefrontSettingsSection initialValues={seedStorefront} />
      <OrderSettingsSection initialValues={seedOrder} />
      <PaymentStatusSection rows={paymentRows} />
    </div>
  )
}
