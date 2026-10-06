import { Container } from '@/components/ui/Container'
import { Skeleton, ProductDetailSkeleton } from '@/components/ui/Skeleton'

export default function ProductDetailLoading() {
  return (
    <main aria-busy="true" className="pb-24 lg:pb-12">
      <Container className="pt-5 sm:pt-7">
        <Skeleton className="h-3 w-56 mb-6 sm:mb-8" />
        <ProductDetailSkeleton />
      </Container>
    </main>
  )
}
