import { getFeaturedProducts } from '../api';
import { ProductGrid } from '../components/ProductTile';
import { ErrorMessage, Loading } from '../components/Status';
import { useAsync } from '../useAsync';

/** H1/H2: the owner's 5 top-rated picks. */
export function HomePage() {
  const featured = useAsync(getFeaturedProducts, []);

  return (
    <>
      <h1>Featured products</h1>
      <p className="lead">Our top-rated picks.</p>
      {featured.status === 'loading' && <Loading label="Loading featured products…" />}
      {featured.status === 'error' && <ErrorMessage error={featured.error} onRetry={featured.retry} />}
      {featured.status === 'success' &&
        (featured.data.length > 0 ? (
          <ProductGrid products={featured.data} label="Featured products" />
        ) : (
          <p>No featured products right now.</p>
        ))}
    </>
  );
}
