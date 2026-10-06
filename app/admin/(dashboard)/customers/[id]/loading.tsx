import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

function Card({ children }: { children?: ReactNode }) {
  return <div className="bg-white border border-border rounded-sm p-5 sm:p-6 flex flex-col gap-4">{children}</div>
}

export default function AdminCustomerDetailLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-3 w-44" />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <Card>
            <Skeleton className="h-3 w-32" />
            <div className="flex flex-wrap gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
          </Card>
          <Card>
            <Skeleton className="h-3 w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
