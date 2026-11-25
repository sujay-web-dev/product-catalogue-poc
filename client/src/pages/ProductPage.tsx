import { Link, useParams } from 'react-router';
import { getProduct } from '../api';
import { ErrorMessage, Loading } from '../components/Status';
import { describeRating, formatPrice } from '../format';
import { useAsync } from '../useAsync';

export function ProductPage() {
  const { id = '' } = useParams();
  const product = useAsync(() => getProduct(id), [id]);

  if (product.status === 'loading') return <Loading label="Loading product…" />;

  if (product.status === 'error') {
    // P1: unknown IDs show a "not found" page.
    if (product.error.status === 404) {
      return (
        <>
          <h1>Product not found</h1>
          <p>
            We couldn’t find that product. <Link to="/">Back to featured products</Link>
          </p>
        </>
      );
    }
    return <ErrorMessage error={product.error} onRetry={product.retry} />;
  }

  const { title, imageUrl, price, category, rating, description } = product.data;
  const ratingText = describeRating(rating);

  // P1: image, title, price, category, description, rating and an Enquire button.
  return (
    <article className="product">
      <img src={imageUrl} alt={title} className="product__image" />
      <div className="product__details">
        <h1>{title}</h1>
        <p className="product__price">{formatPrice(price)}</p>
        <dl className="product__facts">
          <dt>Category</dt>
          <dd>
            <Link to={`/categories/${encodeURIComponent(category.slug)}`}>{category.name}</Link>
          </dd>
          {ratingText && (
            <>
              <dt>Rating</dt>
              <dd>★ {ratingText}</dd>
            </>
          )}
        </dl>
        <p className="product__description">{description}</p>
        {/* E1: the enquiry form is its own page. */}
        <Link to="enquire" className="button-link">
          Enquire
        </Link>
      </div>
    </article>
  );
}
