import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <>
      <h1>Page not found</h1>
      <p>
        That page doesn’t exist. <Link to="/">Back to featured products</Link>
      </p>
    </>
  );
}
