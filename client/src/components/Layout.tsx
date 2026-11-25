import type { FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router';
import { getCategories } from '../api';
import { useAsync } from '../useAsync';

function SearchForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const current = params.get('q') ?? '';

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    if (!q) return; // S3: an empty term doesn't search.
    navigate(`/search?${new URLSearchParams({ q })}`);
  }

  return (
    <form role="search" className="search" onSubmit={onSubmit}>
      <label htmlFor="search-input" className="visually-hidden">
        Search products
      </label>
      {/* key resets the field when the URL's term changes, e.g. on back/forward. */}
      <input
        key={current}
        id="search-input"
        name="q"
        type="search"
        defaultValue={current}
        maxLength={100}
        placeholder="Search products"
      />
      <button type="submit">Search</button>
    </form>
  );
}

function CategoryNav() {
  const categories = useAsync(getCategories, []);
  // The header stays usable without categories; pages show their own errors.
  if (categories.status !== 'success') return null;

  return (
    <nav aria-label="Categories">
      <ul className="category-nav">
        {categories.data.map((category) => (
          <li key={category.slug}>
            <NavLink to={`/categories/${category.slug}`}>{category.name}</NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** C3: every page gets the header with search and category links. */
export function Layout() {
  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand">
            Product Catalogue
          </Link>
          <SearchForm />
        </div>
        <CategoryNav />
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}
