/**
 * G2: the product source is slow, down or returned something unusable.
 * Adapters throw this; the HTTP layer turns it into a friendly 503.
 * The message is for logs only and never reaches the client.
 */
export class ProductSourceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'ProductSourceError';
  }
}
