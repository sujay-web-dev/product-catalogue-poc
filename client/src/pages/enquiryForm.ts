import type { Enquiry } from '../api';

export type EnquiryFields = { name: string; email: string; phone: string; message: string };
export type FieldErrors = Partial<Record<keyof EnquiryFields, string>>;

/** E2: the same limits as the server, which has the final word. */
export const LIMITS = { name: 100, email: 254, phone: 30, message: 2000 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9 +()-]*$/;

/** Browser-side checks that help the customer before anything is sent. */
export function validateEnquiry(fields: EnquiryFields): FieldErrors {
  const errors: FieldErrors = {};
  const name = fields.name.trim();
  const email = fields.email.trim();
  const phone = fields.phone.trim();

  if (!name) errors.name = 'Enter your name';
  else if (name.length > LIMITS.name) errors.name = `Name must be ${LIMITS.name} characters or fewer`;

  if (!email) errors.email = 'Enter your email address';
  else if (email.length > LIMITS.email || !EMAIL.test(email)) {
    errors.email = 'Enter an email address like name@example.com';
  }

  if (phone.length > LIMITS.phone || !PHONE.test(phone)) {
    errors.phone = 'Phone can only contain numbers, spaces and + ( ) -';
  }

  if (fields.message.trim().length > LIMITS.message) {
    errors.message = `Message must be ${LIMITS.message} characters or fewer`;
  }

  return errors;
}

/** E3: only the product ID and contact details are sent; optional fields only if filled. */
export function toEnquiry(productId: string, fields: EnquiryFields): Enquiry {
  const phone = fields.phone.trim();
  const message = fields.message.trim();
  return {
    productId,
    name: fields.name.trim(),
    email: fields.email.trim(),
    ...(phone ? { phone } : {}),
    ...(message ? { message } : {}),
  };
}
