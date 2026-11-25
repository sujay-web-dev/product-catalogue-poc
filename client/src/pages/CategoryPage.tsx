import { Link, useParams } from 'react-router';
import { getCategoryPage } from '../api';
import { ProductGrid } from '../components/ProductTile';
import { ErrorMessage, Loading } from '../components/Status';
import { useAsync } from '../useAsync';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const page = useAsync(() => getCategoryPage(slug), [slug]);

  if (page.status === 'loading') return <Loading label="Loading category…" />;

  if (page.status === 'error') {
    // C2: unknown slugs are a 404 from our API.
    if (page.error.status === 404) {
      return (
        <>
          <h1>Category not found</h1>
          <p>
            We couldn’t find that category. <Link to="/">Back to featured products</Link>
          </p>
        </>
      );
    }
    return <ErrorMessage error={page.error} onRetry={page.retry} />;
  }

  const { category, topRated, additional } = page.data;
  return (
    <>
      <h1>{category.name}</h1>

      <section aria-labelledby="top-rated-heading">
        {/* H2: the owner's picks in this category first, then the highest rated. */}
        <h2 id="top-rated-heading">Top rated</h2>
        {topRated.length > 0 ? (
          <ProductGrid products={topRated} label={`Top rated in ${category.name}`} />
        ) : (
          <p>No products in this category yet.</p>
        )}
      </section>

      {/* C1: every other product in the category; hidden when there are none. */}
      {additional.length > 0 && (
        <section aria-labelledby="more-heading">
          <h2 id="more-heading">More in {category.name}</h2>
          <ProductGrid products={additional} label={`More in ${category.name}`} />
        </section>
      )}
    </>
  );
}
