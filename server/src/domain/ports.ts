// The only two dependencies services may have. Swapping the data source or the
// email provider means writing a new adapter for one of these interfaces.
import type { Category, Product } from './types.ts';

/**
 * Where products come from (Fake Store today).
 * S1: no search() yet; the search service filters listProducts() in memory.
 */
export interface ProductRepository {
  listProducts(): Promise<Product[]>;
  /** Resolves to undefined when no product has this ID. */
  getProduct(id: string): Promise<Product | undefined>;
  listCategories(): Promise<Category[]>;
}

/** E4: plain text only; there is deliberately no HTML field. */
export type EmailMessage = {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
};

/** How email is sent (SMTP today). Rejects if the message was not accepted. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
