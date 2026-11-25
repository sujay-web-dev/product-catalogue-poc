import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { CategoryPage } from './pages/CategoryPage';
import { HomePage } from './pages/HomePage';

// Placeholder pages; each is replaced by a real page in tasks 16–18.
function Placeholder({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categories/:slug" element={<CategoryPage />} />
        <Route path="search" element={<Placeholder title="Search results" />} />
        <Route path="products/:id" element={<Placeholder title="Product" />} />
        {/* E1: the enquiry form is its own page. */}
        <Route path="products/:id/enquire" element={<Placeholder title="Enquire" />} />
        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Route>
    </Routes>
  );
}
