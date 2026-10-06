import { ProductListingSkeleton } from '@/components/ui/Skeleton'

export default function ProductsLoading() {
  return (
    <main aria-busy="true">
      <ProductListingSkeleton columns={4} />
    </main>
  )
}
