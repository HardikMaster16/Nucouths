import { ProductListingSkeleton } from '@/components/ui/Skeleton'

export default function CollectionLoading() {
  return (
    <main aria-busy="true">
      <ProductListingSkeleton columns={4} withDescription />
    </main>
  )
}
