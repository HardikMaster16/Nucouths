import { Skeleton } from '@/components/ui/Skeleton'

function SectionSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="bg-white border border-border rounded-sm p-5 sm:p-6 flex flex-col gap-4">
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

export default function AdminSettingsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div>
        <Skeleton className="h-7 w-24 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <SectionSkeleton fields={4} />
      <SectionSkeleton fields={4} />
      <SectionSkeleton fields={2} />

      <div className="bg-white border border-border rounded-sm p-5 sm:p-6 flex flex-col gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
}
