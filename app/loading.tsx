import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'

// Generic fallback for any route segment that doesn't have a more specific
// loading.tsx of its own — shown only briefly, while that segment's code and
// data are being fetched. Intentionally minimal: it can't know the shape of
// the page that's about to render, so it reserves general space rather than
// mocking up a specific layout (that's what the route-level loading.tsx
// files are for).
export default function RootLoading() {
  return (
    <main aria-busy="true" className="py-16 sm:py-20">
      <Container size="sm">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </Container>
    </main>
  )
}
