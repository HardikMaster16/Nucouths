'use client'

import React, { useMemo, useState } from 'react'
import { CustomersToolbar } from './CustomersToolbar'
import type { CustomerStatusFilter, CustomerSortOption } from './CustomersToolbar'
import { CustomersTable } from './CustomersTable'
import type { AdminCustomerRow } from '@/lib/admin/customers'

interface AdminCustomersClientProps {
  initialCustomers: AdminCustomerRow[]
}

export function AdminCustomersClient({ initialCustomers }: AdminCustomersClientProps) {
  const [customers] = useState(initialCustomers)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CustomerStatusFilter>('all')
  const [sort, setSort] = useState<CustomerSortOption>('newest')

  const hasActiveFilters = search.trim() !== '' || status !== 'all' || sort !== 'newest'

  function clearFilters() {
    setSearch('')
    setStatus('all')
    setSort('newest')
  }

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()

    let result = customers.filter((customer) => {
      if (query && !customer.name.toLowerCase().includes(query) && !customer.email.toLowerCase().includes(query)) {
        return false
      }
      if (status !== 'all' && customer.status !== status) return false
      return true
    })

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return a.joinedAt.localeCompare(b.joinedAt)
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'newest':
        default:
          return b.joinedAt.localeCompare(a.joinedAt)
      }
    })

    return result
  }, [customers, search, status, sort])

  return (
    <div className="flex flex-col gap-4">
      <CustomersToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        sort={sort}
        onSortChange={setSort}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <p className="text-xs font-sans text-text-secondary" aria-live="polite">
        {filteredCustomers.length} of {customers.length} customers
      </p>

      <CustomersTable
        customers={filteredCustomers}
        totalCustomerCount={customers.length}
        onClearFilters={clearFilters}
      />
    </div>
  )
}
