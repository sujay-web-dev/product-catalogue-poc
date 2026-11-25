import { Link } from 'react-router';
import type { Product } from '../api';
import { describeRating, formatPrice } from '../format';

/** A product card; the whole tile is one link to the product page. */
export function ProductTile({ product }: { product: Product }) {
  const rating = describeRating(product.rating);

  return (
    <Link to={`/products/${encodeURIComponent(product.id)}`} className="tile">
      {/* The title is already the link text, so the image is decorative here (G1). */}
      <img src={product.imageUrl} alt="" loading="lazy" className="tile__image" />
      <span className="tile__title">{product.title}</span>
      <span className="tile__price">{formatPrice(product.price)}</span>
      {rating && <span className="tile__rating">★ {rating}</span>}
    </Link>
  );
}

export function ProductGrid({ products, label }: { products: Product[]; label: string }) {
  return (
    <ul className="product-grid" aria-label={label}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}
