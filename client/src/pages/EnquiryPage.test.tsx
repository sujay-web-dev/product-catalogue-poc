import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { jacket } from '../test/fixtures';
import { apiError, mockCategories, mockEnquiry, mockProducts } from '../test/handlers';
import { renderApp } from '../test/renderApp';
import { server } from '../test/server';

beforeEach(() => {
  mockCategories();
});

const nameInput = () => screen.getByRole('textbox', { name: 'Name' });
const emailInput = () => screen.getByRole('textbox', { name: 'Email' });
const phoneInput = () => screen.getByRole('textbox', { name: 'Phone (optional)' });
const messageInput = () => screen.getByRole('textbox', { name: 'Message (optional)' });
const sendButton = () => screen.getByRole('button', { name: 'Send enquiry' });

async function openForm(path = '/products/1/enquire') {
  renderApp(path);
  await screen.findByRole('heading', { level: 1, name: 'Enquire about Mens Cotton Jacket' });
}

async function fillRequired() {
  await userEvent.type(nameInput(), 'Ada Lovelace');
  await userEvent.type(emailInput(), 'ada@example.com');
}

describe('Enquiry page', () => {
  it('sends the enquiry and then says thank you (acceptance: enquiry)', async () => {
    mockProducts();
    const sent = mockEnquiry();
    renderApp('/products/1');

    // GIVEN I am viewing a product AND I click on the Enquire button …
    await userEvent.click(await screen.findByRole('link', { name: 'Enquire' }));
    await screen.findByRole('heading', { level: 1, name: 'Enquire about Mens Cotton Jacket' });

    // … AND I complete the form with my contact details, WHEN I submit the form …
    await fillRequired();
    await userEvent.click(sendButton());

    // … THEN the sales inbox gets the enquiry (server side) AND I see a "Thank you" message.
    expect(await screen.findByRole('heading', { level: 1, name: 'Thank you' })).toHaveFocus();
    expect(screen.getByText(/Our sales team will reply to ada@example.com/)).toBeInTheDocument();
    expect(sent).toEqual([{ productId: '1', name: 'Ada Lovelace', email: 'ada@example.com' }]);
  });

  it('sends trimmed values, and phone and message only when filled in (E3)', async () => {
    mockProducts();
    const sent = mockEnquiry();
    await openForm();

    await userEvent.type(nameInput(), '  Ada  ');
    await userEvent.type(emailInput(), ' ada@example.com ');
    await userEvent.type(phoneInput(), '+61 400 000 000');
    await userEvent.type(messageInput(), 'Is this available in XL?');
    await userEvent.click(sendButton());

    await screen.findByRole('heading', { level: 1, name: 'Thank you' });
    expect(sent).toEqual([
      {
        productId: '1',
        name: 'Ada',
        email: 'ada@example.com',
        phone: '+61 400 000 000',
        message: 'Is this available in XL?',
      },
    ]);
  });

  describe('checks in the browser (E2)', () => {
    it('asks for name and email, focuses the first problem, and sends nothing', async () => {
      mockProducts();
      const sent = mockEnquiry();
      await openForm();

      await userEvent.click(sendButton());

      expect(screen.getByText('Enter your name')).toBeInTheDocument();
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
      expect(nameInput()).toHaveAttribute('aria-invalid', 'true');
      expect(nameInput()).toHaveAccessibleDescription('Enter your name');
      expect(nameInput()).toHaveFocus();
      expect(sent).toEqual([]);
    });

    it('rejects an invalid email and phone', async () => {
      mockProducts();
      const sent = mockEnquiry();
      await openForm();

      await userEvent.type(nameInput(), 'Ada');
      await userEvent.type(emailInput(), 'ada@');
      await userEvent.type(phoneInput(), 'call me');
      await userEvent.click(sendButton());

      expect(screen.getByText('Enter an email address like name@example.com')).toBeInTheDocument();
      expect(screen.getByText('Phone can only contain numbers, spaces and + ( ) -')).toBeInTheDocument();
      expect(emailInput()).toHaveFocus();
      expect(sent).toEqual([]);
    });

    it('clears a field’s message once it is edited', async () => {
      mockProducts();
      mockEnquiry();
      await openForm();

      await userEvent.click(sendButton());
      await userEvent.type(nameInput(), 'A');

      expect(screen.queryByText('Enter your name')).not.toBeInTheDocument();
      expect(nameInput()).not.toHaveAttribute('aria-invalid');
    });

    it('limits each field to the server’s lengths', async () => {
      mockProducts();
      await openForm();

      expect(nameInput()).toHaveAttribute('maxLength', '100');
      expect(emailInput()).toHaveAttribute('maxLength', '254');
      expect(phoneInput()).toHaveAttribute('maxLength', '30');
      expect(messageInput()).toHaveAttribute('maxLength', '2000');
    });
  });

  describe('when sending fails (E5)', () => {
    it('shows the server’s message, keeps what was typed, and can send again', async () => {
      mockProducts();
      const sent = mockEnquiry(
        () => apiError(502, 'EMAIL_SEND_FAILED', "We couldn't send your enquiry. Please try again."),
        () => HttpResponse.json({ status: 'sent' }, { status: 201 }),
      );
      await openForm();
      await fillRequired();
      await userEvent.type(messageInput(), 'Is this available in XL?');

      await userEvent.click(sendButton());

      expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't send your enquiry. Please try again.");
      expect(screen.queryByRole('heading', { name: 'Thank you' })).not.toBeInTheDocument();
      expect(nameInput()).toHaveValue('Ada Lovelace');
      expect(emailInput()).toHaveValue('ada@example.com');
      expect(messageInput()).toHaveValue('Is this available in XL?');

      await userEvent.click(sendButton());

      expect(await screen.findByRole('heading', { level: 1, name: 'Thank you' })).toBeInTheDocument();
      expect(sent).toHaveLength(2);
    });

    it.each([
      [429, 'RATE_LIMITED', 'Too many enquiries. Please try again later.'],
      [422, 'UNKNOWN_PRODUCT', 'This product is no longer available'],
      [400, 'VALIDATION_ERROR', 'Please check: email'],
    ])('shows the server’s message for %i %s', async (status, code, message) => {
      mockProducts();
      mockEnquiry(() => apiError(status, code, message));
      await openForm();
      await fillRequired();

      await userEvent.click(sendButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    });
  });

  it('disables the button while sending, so it can’t be sent twice', async () => {
    mockProducts();
    server.use(
      http.post('/api/enquiries', async () => {
        await delay(50);
        return HttpResponse.json({ status: 'sent' }, { status: 201 });
      }),
    );
    await openForm();
    await fillRequired();

    await userEvent.click(sendButton());

    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(await screen.findByRole('heading', { level: 1, name: 'Thank you' })).toBeInTheDocument();
  });

  it('shows "Product not found" for an unknown product', async () => {
    mockProducts();
    renderApp('/products/999/enquire');

    expect(await screen.findByRole('heading', { level: 1, name: 'Product not found' })).toBeInTheDocument();
    // Not queryByRole('form'): an unnamed <form> has no role, so that could never fail.
    expect(screen.queryByRole('button', { name: 'Send enquiry' })).not.toBeInTheDocument();
  });

  it('shows a retry when the product can’t be loaded (G2)', async () => {
    let calls = 0;
    server.use(
      http.get('/api/products/:id', () => {
        calls += 1;
        return calls === 1
          ? apiError(503, 'PRODUCT_SOURCE_UNAVAILABLE', 'Products are temporarily unavailable. Please try again shortly.')
          : HttpResponse.json({ product: jacket });
      }),
    );
    renderApp('/products/1/enquire');

    await userEvent.click(within(await screen.findByRole('alert')).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Enquire about Mens Cotton Jacket' })).toBeInTheDocument();
  });
});
