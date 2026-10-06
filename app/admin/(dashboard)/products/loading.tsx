import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminProductsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>

      <div className="bg-white border border-border rounded-sm p-4 flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <div className="flex flex-wrap gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
      </div>

      <div className="bg-white border border-border rounded-sm p-4 flex flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="w-11 h-11 shrink-0" />
            <Skeleton className="h-4 flex-1 max-w-[220px]" />
            <Skeleton className="h-4 w-20 hidden sm:block" />
            <Skeleton className="h-4 w-16 hidden md:block" />
            <Skeleton className="h-4 w-24 hidden lg:block" />
            <Skeleton className="h-4 w-20 hidden lg:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
