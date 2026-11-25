import type { Category, Product } from '../api';

// Shaped like our API's responses, not Fake Store's.
export const mensClothing: Category = { slug: 'mens-clothing', name: "Men's Clothing" };
export const jewellery: Category = { slug: 'jewellery', name: 'Jewellery' };
export const categories: Category[] = [mensClothing, jewellery];

function product(id: string, title: string, category: Category, price: number, rate?: number): Product {
  return {
    id,
    title,
    description: `Description of ${title}.`,
    price,
    imageUrl: `https://images.example.com/${id}.jpg`,
    category,
    ...(rate === undefined ? {} : { rating: { rate, count: 100 } }),
  };
}

export const jacket = product('1', 'Mens Cotton Jacket', mensClothing, 55.99, 4.7);
export const belt = product('2', 'Mens Leather Belt', mensClothing, 29.5, 3.9);
export const beanie = product('3', 'Mens Wool Beanie', mensClothing, 12, 4.1);
export const shorts = product('4', 'Mens Running Shorts', mensClothing, 22, 3.3);
export const ring = product('5', 'Gold Plated Ring', jewellery, 9.99);
