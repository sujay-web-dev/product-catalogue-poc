import { describe, expect, it } from 'vitest';
import { fixtureProducts } from '../testing/inMemoryProductRepository.ts';
import { buildEnquiryEmail } from './enquiry.ts';
import type { Product } from './types.ts';

const addresses = { from: 'no-reply@shop.test', salesInbox: 'sales@shop.test' };
const jacket = fixtureProducts[0] as Product;

describe('buildEnquiryEmail (E4)', () => {
  it('goes to the sales inbox from the no-reply address, with Reply-To the customer', () => {
    const email = buildEnquiryEmail(
      { productId: '1', name: 'Ada Lovelace', email: 'ada@example.com' },
      jacket,
      addresses,
    );

    expect(email.to).toBe('sales@shop.test');
    expect(email.from).toBe('no-reply@shop.test');
    expect(email.replyTo).toBe('ada@example.com');
    expect(email.subject).toBe('Product enquiry: Mens Cotton Jacket');
  });

  it('includes the product, contact details and message as plain text', () => {
    const email = buildEnquiryEmail(
      {
        productId: '1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        phone: '+61 400 000 000',
        message: 'Is this available in XL?\nThanks.',
      },
      jacket,
      addresses,
    );

    expect(email.text).toContain('Product: Mens Cotton Jacket');
    expect(email.text).toContain('Product ID: 1');
    expect(email.text).toContain("Category: Men's Clothing");
    expect(email.text).toContain('Price: A$55.99');
    expect(email.text).toContain('Name: Ada Lovelace');
    expect(email.text).toContain('Email: ada@example.com');
    expect(email.text).toContain('Phone: +61 400 000 000');
    expect(email.text).toContain('Is this available in XL?\nThanks.');
    expect(email).not.toHaveProperty('html');
  });

  it('says when optional fields were left out', () => {
    const email = buildEnquiryEmail(
      { productId: '1', name: 'Ada', email: 'ada@example.com', phone: '', message: '' },
      jacket,
      addresses,
    );

    expect(email.text).toContain('Phone: Not given');
    expect(email.text).toContain('Message:\nNo message');
  });

  it('keeps the subject on one line even if a product title contains line breaks', () => {
    const email = buildEnquiryEmail(
      { productId: '1', name: 'Ada', email: 'ada@example.com' },
      { ...jacket, title: 'Jacket\r\nBcc: someone@evil.test' },
      addresses,
    );

    expect(email.subject).toBe('Product enquiry: Jacket Bcc: someone@evil.test');
    expect(email.subject).not.toMatch(/[\r\n]/);
  });
});
