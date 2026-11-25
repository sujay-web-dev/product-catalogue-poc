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

/**
 * E5: the email provider did not accept the enquiry email.
 * The HTTP layer turns this into a 502 so the customer can retry.
 */
export class EmailDeliveryError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Enquiry email could not be sent', options);
    this.name = 'EmailDeliveryError';
  }
}
