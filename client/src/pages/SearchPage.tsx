import { useSearchParams } from 'react-router';
import { searchProducts } from '../api';
import { ProductGrid } from '../components/ProductTile';
import { ErrorMessage, Loading } from '../components/Status';
import { useAsync } from '../useAsync';

function SearchResults({ query }: { query: string }) {
  const results = useAsync(() => searchProducts(query), [query]);

  return (
    <>
      <h1>Search results for “{query}”</h1>
      {results.status === 'loading' && <Loading label="Searching…" />}
      {results.status === 'error' && (
        // A 400 (e.g. a term over 100 characters typed into the URL) won't fix itself.
        <ErrorMessage error={results.error} onRetry={results.error.status === 400 ? undefined : results.retry} />
      )}
      {results.status === 'success' &&
        (results.data.length > 0 ? (
          <>
            <p className="lead">
              {results.data.length === 1 ? '1 product found' : `${results.data.length} products found`}
            </p>
            <ProductGrid products={results.data} label="Search results" />
          </>
        ) : (
          <p>No products match “{query}”. Try a different word, or browse a category.</p>
        ))}
    </>
  );
}

/** S3: results live at /search?q=…, so they can be shared and the back button works. */
export function SearchPage() {
  const [params] = useSearchParams();
  const query = (params.get('q') ?? '').trim();

  // S3: an empty term doesn't search.
  if (!query) {
    return (
      <>
        <h1>Search</h1>
        <p>Enter a search term above to find products.</p>
      </>
    );
  }
  return <SearchResults query={query} />;
}
