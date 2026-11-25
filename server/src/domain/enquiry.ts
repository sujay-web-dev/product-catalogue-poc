import type { EmailMessage } from './ports.ts';
import type { Product } from './types.ts';

/** E2/E3: what the customer sends; product details are looked up by the server. */
export type Enquiry = {
  productId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
};

export type EmailAddresses = {
  /** E4: a fixed no-reply address. */
  from: string;
  salesInbox: string;
};

/** Removes line breaks and other control characters from header text. */
function oneLine(text: string): string {
  return text.replace(/\p{Cc}+/gu, ' ').trim();
}

/**
 * E4: plain text to the sales inbox, From a no-reply address, Reply-To the
 * customer so sales can answer in one click.
 */
export function buildEnquiryEmail(
  enquiry: Enquiry,
  product: Product,
  addresses: EmailAddresses,
): EmailMessage {
  const text = [
    'New product enquiry from the catalogue.',
    '',
    `Product: ${product.title}`,
    `Product ID: ${product.id}`,
    `Category: ${product.category.name}`,
    `Price: A$${product.price.toFixed(2)}`, // P1
    '',
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone || 'Not given'}`,
    '',
    'Message:',
    enquiry.message || 'No message',
    '',
    'Reply to this email to answer the customer directly.',
  ].join('\n');

  return {
    to: addresses.salesInbox,
    from: addresses.from,
    replyTo: enquiry.email,
    subject: oneLine(`Product enquiry: ${product.title}`),
    text,
  };
}
