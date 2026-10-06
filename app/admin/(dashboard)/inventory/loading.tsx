import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminInventoryLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div>
        <Skeleton className="h-7 w-28 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-56" />

        <div className="bg-white border border-border rounded-sm p-4 flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-36" />
            ))}
          </div>
        </div>

        <Skeleton className="h-3 w-28" />

        <div className="bg-white border border-border rounded-sm p-4 flex flex-col gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1 max-w-[180px]" />
              <Skeleton className="h-4 w-20 hidden sm:block" />
              <Skeleton className="h-4 w-16 hidden md:block" />
              <Skeleton className="h-4 w-12 hidden lg:block" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20 hidden lg:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
