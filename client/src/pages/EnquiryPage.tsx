import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, getProduct, sendEnquiry, type Product } from '../api';
import { ErrorMessage, Loading } from '../components/Status';
import { useAsync } from '../useAsync';
import { LIMITS, toEnquiry, validateEnquiry, type EnquiryFields, type FieldErrors } from './enquiryForm';

type SubmitState = { status: 'idle' } | { status: 'sending' } | { status: 'sent' } | { status: 'failed'; error: ApiError };

const EMPTY: EnquiryFields = { name: '', email: '', phone: '', message: '' };
const FIELD_ORDER: Array<keyof EnquiryFields> = ['name', 'email', 'phone', 'message'];

function ThankYou({ product, email }: { product: Product; email: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []); // announce the result to screen readers

  return (
    <section className="thank-you">
      <h1 tabIndex={-1} ref={heading}>
        Thank you
      </h1>
      <p>
        Your enquiry about <strong>{product.title}</strong> has been sent. Our sales team will reply to {email}.
      </p>
      <p>
        <Link to={`/products/${encodeURIComponent(product.id)}`}>Back to the product</Link> ·{' '}
        <Link to="/">Continue browsing</Link>
      </p>
    </section>
  );
}

function EnquiryForm({ product }: { product: Product }) {
  // Kept in state, so nothing typed is lost when sending fails (E5).
  const [fields, setFields] = useState<EnquiryFields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });
  const inputs = useRef<Partial<Record<keyof EnquiryFields, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  if (submit.status === 'sent') return <ThankYou product={product} email={fields.email.trim()} />;

  const update = (field: keyof EnquiryFields) => (value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateEnquiry(fields);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus();
      return;
    }

    setSubmit({ status: 'sending' });
    try {
      await sendEnquiry(toEnquiry(product.id, fields));
      setSubmit({ status: 'sent' }); // E5: only after the API confirms the email was sent.
    } catch (error) {
      setSubmit({
        status: 'failed',
        error: error instanceof ApiError ? error : new ApiError(0, 'UNKNOWN', 'Something went wrong. Please try again.'),
      });
    }
  }

  const sending = submit.status === 'sending';
  const field = (name: keyof EnquiryFields) => ({
    id: `enquiry-${name}`,
    name,
    value: fields[name],
    maxLength: LIMITS[name],
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `enquiry-${name}-error` : undefined,
    ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      inputs.current[name] = element;
    },
  });
  const fieldError = (name: keyof EnquiryFields) =>
    errors[name] && (
      <p id={`enquiry-${name}-error`} className="field__error">
        {errors[name]}
      </p>
    );

  return (
    <>
      <h1>Enquire about {product.title}</h1>
      <p className="lead">Send us your details and our sales team will get back to you.</p>

      {submit.status === 'failed' && <ErrorMessage error={submit.error} />}

      {/* noValidate: our own messages instead of the browser's, the same in every browser. */}
      <form className="enquiry-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="enquiry-name">Name</label>
          <input {...field('name')} type="text" autoComplete="name" onChange={(e) => update('name')(e.target.value)} />
          {fieldError('name')}
        </div>
        <div className="field">
          <label htmlFor="enquiry-email">Email</label>
          <input
            {...field('email')}
            type="email"
            autoComplete="email"
            onChange={(e) => update('email')(e.target.value)}
          />
          {fieldError('email')}
        </div>
        <div className="field">
          <label htmlFor="enquiry-phone">
            Phone <span className="field__optional">(optional)</span>
          </label>
          <input {...field('phone')} type="tel" autoComplete="tel" onChange={(e) => update('phone')(e.target.value)} />
          {fieldError('phone')}
        </div>
        <div className="field">
          <label htmlFor="enquiry-message">
            Message <span className="field__optional">(optional)</span>
          </label>
          <textarea {...field('message')} rows={5} onChange={(e) => update('message')(e.target.value)} />
          {fieldError('message')}
        </div>
        <button type="submit" disabled={sending}>
          {sending ? 'Sending…' : 'Send enquiry'}
        </button>
      </form>
    </>
  );
}

/** E1: the enquiry form is its own page, /products/:id/enquire. */
export function EnquiryPage() {
  const { id = '' } = useParams();
  const product = useAsync(() => getProduct(id), [id]);

  if (product.status === 'loading') return <Loading label="Loading product…" />;
  if (product.status === 'error') {
    if (product.error.status === 404) {
      return (
        <>
          <h1>Product not found</h1>
          <p>
            We couldn’t find that product. <Link to="/">Back to featured products</Link>
          </p>
        </>
      );
    }
    return <ErrorMessage error={product.error} onRetry={product.retry} />;
  }
  return <EnquiryForm product={product.data} />;
}
