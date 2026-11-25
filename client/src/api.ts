// The only module that talks to the network. It calls our backend's /api only;
// the client never knows where products actually come from.

export type Category = { slug: string; name: string };

export type Product = {
  id: string;
  title: string;
  description: string;
  /** P1: AUD. */
  price: number;
  imageUrl: string;
  category: Category;
  /** Optional: the source may not provide one (G4). */
  rating?: { rate: number; count: number };
};

export type CategoryPage = {
  category: Category;
  topRated: Product[];
  additional: Product[];
};

export type Enquiry = {
  productId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
};

/** A failed API call, with the server's code and a message that is safe to show. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function isErrorBody(body: unknown): body is { error: { code: string; message: string } } {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const { error } = body;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { Accept: 'application/json', ...init?.headers } });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    if (isErrorBody(body)) throw new ApiError(response.status, body.error.code, body.error.message);
    throw new ApiError(response.status, 'UNKNOWN', 'Something went wrong. Please try again.');
  }
  // Our own API, whose shapes the server tests pin down; trusted rather than re-validated.
  return body as T;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return (await request<{ products: Product[] }>('/api/products/featured')).products;
}

export async function getProduct(id: string): Promise<Product> {
  return (await request<{ product: Product }>(`/api/products/${encodeURIComponent(id)}`)).product;
}

export async function getCategories(): Promise<Category[]> {
  return (await request<{ categories: Category[] }>('/api/categories')).categories;
}

export async function getCategoryPage(slug: string): Promise<CategoryPage> {
  return request<CategoryPage>(`/api/categories/${encodeURIComponent(slug)}`);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const params = new URLSearchParams({ q: query });
  return (await request<{ products: Product[] }>(`/api/search?${params}`)).products;
}

/** E5: resolves only once the server confirms the email was sent. */
export async function sendEnquiry(enquiry: Enquiry): Promise<void> {
  await request<{ status: 'sent' }>('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enquiry),
  });
}
