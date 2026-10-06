import React from 'react'

interface KpiCardProps {
  label: string
  value: string
  supporting?: string
  icon: React.ComponentType<{ className?: string }>
}

export function KpiCard({ label, value, supporting, icon: Icon }: KpiCardProps) {
  return (
    <div className="bg-white border border-border rounded-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-sans font-medium tracking-wide uppercase text-text-secondary">
          {label}
        </p>
        <div className="w-8 h-8 rounded-sm bg-surface flex items-center justify-center text-text-secondary shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl sm:text-[28px] font-sans font-semibold text-text-primary leading-none">
        {value}
      </p>
      {supporting && (
        <p className="text-xs font-sans text-text-secondary">{supporting}</p>
      )}
    </div>
  )
}
