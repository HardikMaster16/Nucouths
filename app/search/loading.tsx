import { ProductListingSkeleton } from '@/components/ui/Skeleton'

export default function SearchLoading() {
  return (
    <main aria-busy="true">
      <ProductListingSkeleton columns={4} withSearchField />
    </main>
  )
}
