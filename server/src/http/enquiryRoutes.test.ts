import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { FakeEmailSender } from '../testing/fakeEmailSender.ts';
import { FailingProductRepository } from '../testing/inMemoryProductRepository.ts';
import { createTestApp } from '../testing/testApp.ts';

const validEnquiry = {
  productId: '1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+61 400 000 000',
  message: 'Is this available in XL?',
};

let logs: MockInstance[];
beforeEach(() => {
  logs = [
    vi.spyOn(console, 'info').mockImplementation(() => {}),
    vi.spyOn(console, 'warn').mockImplementation(() => {}),
    vi.spyOn(console, 'error').mockImplementation(() => {}),
  ];
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** E7: nothing the customer typed may appear in any log line. */
function expectNoContactDetailsLogged() {
  const logged = logs.flatMap((spy) => spy.mock.calls.flat().map(String)).join('\n');
  for (const value of [validEnquiry.name, validEnquiry.email, validEnquiry.phone, validEnquiry.message]) {
    expect(logged).not.toContain(value);
  }
}

function setup() {
  const emailSender = new FakeEmailSender();
  const app = createTestApp({ emailSender });
  const post = (body: unknown, ip = '203.0.113.1') =>
    request(app).post('/api/enquiries').set('X-Forwarded-For', ip).send(body as object);
  return { app, emailSender, post };
}

describe('POST /api/enquiries', () => {
  it('emails the sales inbox and confirms only after sending (E4, E5)', async () => {
    const { emailSender, post } = setup();

    const res = await post(validEnquiry);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ status: 'sent' });
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]).toMatchObject({
      to: 'sales@shop.test',
      from: 'no-reply@shop.test',
      replyTo: 'ada@example.com',
      subject: 'Product enquiry: Mens Cotton Jacket',
    });
    expectNoContactDetailsLogged();
  });

  it('uses product details from the server, ignoring any sent by the client (E3)', async () => {
    const { emailSender, post } = setup();

    await post({ ...validEnquiry, title: 'Free TV', price: 0, to: 'attacker@evil.test' });

    const [email] = emailSender.sent;
    expect(email?.text).toContain('Product: Mens Cotton Jacket');
    expect(email?.text).toContain('Price: A$55.99');
    expect(email?.text).not.toContain('Free TV');
    expect(email?.to).toBe('sales@shop.test');
  });

  it('accepts an enquiry without phone or message, including empty strings (E2)', async () => {
    const { emailSender, post } = setup();

    expect((await post({ productId: '1', name: 'Ada', email: 'ada@example.com' })).status).toBe(201);
    expect((await post({ ...validEnquiry, phone: '', message: '' })).status).toBe(201);
    expect(emailSender.sent).toHaveLength(2);
  });

  it('trims fields before sending', async () => {
    const { emailSender, post } = setup();

    await post({ ...validEnquiry, name: '  Ada  ', email: '  ada@example.com ' });

    expect(emailSender.sent[0]?.replyTo).toBe('ada@example.com');
    expect(emailSender.sent[0]?.text).toContain('Name: Ada\n');
  });

  describe('validation (E2)', () => {
    it.each([
      ['a missing name', { name: undefined }, 'name'],
      ['a blank name', { name: '   ' }, 'name'],
      ['a name over 100 characters', { name: 'a'.repeat(101) }, 'name'],
      ['a name with a line break', { name: 'Ada\nBcc: x@evil.test' }, 'name'],
      ['a missing email', { email: undefined }, 'email'],
      ['an invalid email', { email: 'not-an-email' }, 'email'],
      ['a phone with letters', { phone: 'call me' }, 'phone'],
      ['a message over 2000 characters', { message: 'a'.repeat(2001) }, 'message'],
      ['an invalid product ID', { productId: '../1' }, 'productId'],
    ])('rejects %s with 400 and sends nothing', async (_name, change, field) => {
      const { emailSender, post } = setup();

      const res = await post({ ...validEnquiry, ...change });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: { code: 'VALIDATION_ERROR', message: `Please check: ${field}` } });
      expect(emailSender.sent).toHaveLength(0);
    });

    it('lists every invalid field without echoing the values', async () => {
      const { post } = setup();

      const res = await post({ productId: '1', name: '', email: 'nope@' });

      expect(res.body.error.message).toBe('Please check: name, email');
      expect(JSON.stringify(res.body)).not.toContain('nope@');
    });

    it('rejects a body that is not an object', async () => {
      const { post } = setup();

      expect((await post(['not', 'an', 'object'])).status).toBe(400);
    });
  });

  it('rejects an unknown product with 422 and sends nothing (E3)', async () => {
    const { emailSender, post } = setup();

    const res = await post({ ...validEnquiry, productId: '999' });

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: { code: 'UNKNOWN_PRODUCT', message: 'This product is no longer available' },
    });
    expect(emailSender.sent).toHaveLength(0);
  });

  it('returns 502 when the email cannot be sent, and logs no contact details (E5, E7)', async () => {
    const { emailSender, post } = setup();
    emailSender.shouldFail = true;

    const res = await post(validEnquiry);

    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      error: { code: 'EMAIL_SEND_FAILED', message: "We couldn't send your enquiry. Please try again." },
    });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('product 1'));
    expectNoContactDetailsLogged();
  });

  it('returns 503 when the product source is down', async () => {
    const app = createTestApp({ productRepository: new FailingProductRepository() });

    const res = await request(app).post('/api/enquiries').send(validEnquiry);

    expect(res.status).toBe(503);
  });

  describe('rate limit (E7)', () => {
    it('allows 10 enquiries per client per 15 minutes, then returns 429', async () => {
      const { emailSender, post } = setup();

      for (let i = 0; i < 10; i++) {
        expect((await post(validEnquiry)).status).toBe(201);
      }
      const res = await post(validEnquiry);

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        error: { code: 'RATE_LIMITED', message: 'Too many enquiries. Please try again later.' },
      });
      expect(emailSender.sent).toHaveLength(10);
    });

    it('counts each client separately, using the IP forwarded by the proxy', async () => {
      const { post } = setup();

      for (let i = 0; i < 10; i++) await post(validEnquiry, '203.0.113.1');

      expect((await post(validEnquiry, '203.0.113.1')).status).toBe(429);
      expect((await post(validEnquiry, '198.51.100.7')).status).toBe(201);
    });
  });
});
