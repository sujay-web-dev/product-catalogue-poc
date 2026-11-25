import { buildEnquiryEmail, type EmailAddresses, type Enquiry } from '../domain/enquiry.ts';
import { EmailDeliveryError } from '../domain/errors.ts';
import type { EmailSender, ProductRepository } from '../domain/ports.ts';

export type EnquiryResult = 'sent' | 'unknown-product';

/** Error name and code only: provider messages can contain addresses (E7). */
function describeError(err: unknown): string {
  if (!(err instanceof Error)) return 'unknown error';
  const code = 'code' in err && typeof err.code === 'string' ? ` (${err.code})` : '';
  return `${err.name}${code}`;
}

/** Depends only on the ProductRepository and EmailSender interfaces. */
export class EnquiryService {
  private readonly products: ProductRepository;
  private readonly email: EmailSender;
  private readonly addresses: EmailAddresses;

  constructor(products: ProductRepository, email: EmailSender, addresses: EmailAddresses) {
    this.products = products;
    this.email = email;
    this.addresses = addresses;
  }

  /**
   * E3: looks the product up itself, so the email can't carry forged details.
   * E6: nothing is stored; the email is the record.
   */
  async submit(enquiry: Enquiry): Promise<EnquiryResult> {
    const product = await this.products.getProduct(enquiry.productId);
    if (!product) return 'unknown-product';

    try {
      await this.email.send(buildEnquiryEmail(enquiry, product, this.addresses));
    } catch (cause) {
      // E7: log the product ID and error type, never contact details.
      console.error(`Enquiry email failed for product ${product.id}: ${describeError(cause)}`);
      throw new EmailDeliveryError({ cause });
    }

    console.info(`Enquiry email sent for product ${product.id}`);
    return 'sent';
  }
}
