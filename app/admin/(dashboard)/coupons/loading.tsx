import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminCouponsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Skeleton className="h-7 w-52 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>

      <div className="bg-white border border-border rounded-sm p-4 flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-36" />
      </div>

      <Skeleton className="h-3 w-24" />

      <div className="bg-white border border-border rounded-sm p-4 flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-4 w-16 hidden sm:block" />
            <Skeleton className="h-4 w-20 hidden md:block" />
            <Skeleton className="h-4 w-16 hidden lg:block" />
            <Skeleton className="h-4 flex-1 max-w-[120px] hidden lg:block" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
