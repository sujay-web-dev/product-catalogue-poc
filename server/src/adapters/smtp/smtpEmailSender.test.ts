import net from 'node:net';
import nodemailer from 'nodemailer';
import { describe, expect, it } from 'vitest';
import type { EmailMessage } from '../../domain/ports.ts';
import { createSmtpTransport, SmtpEmailSender, type MailTransport } from './smtpEmailSender.ts';

const message: EmailMessage = {
  to: 'sales@shop.test',
  from: 'no-reply@shop.test',
  replyTo: 'ada@example.com',
  subject: 'Product enquiry: Mens Cotton Jacket',
  text: 'Name: Ada Lovelace\nMessage:\n<b>not html</b>',
};

/** Nodemailer's stream transport builds the real email without sending it. */
async function renderEmail(): Promise<string> {
  let raw = '';
  const streamTransport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
  const transport: MailTransport = {
    sendMail: async (mail) => {
      const info = await streamTransport.sendMail(mail);
      raw = String(info.message);
      return info;
    },
  };

  await new SmtpEmailSender(transport).send(message);
  return raw;
}

describe('SmtpEmailSender (E4)', () => {
  it('sets To, From and Reply-To headers', async () => {
    const raw = await renderEmail();

    expect(raw).toMatch(/^To: sales@shop\.test$/m);
    expect(raw).toMatch(/^From: no-reply@shop\.test$/m);
    expect(raw).toMatch(/^Reply-To: ada@example\.com$/m);
    expect(raw).toMatch(/^Subject: Product enquiry: Mens Cotton Jacket$/m);
  });

  it('sends a single plain-text part, with no HTML', async () => {
    const raw = await renderEmail();

    expect(raw).toMatch(/^Content-Type: text\/plain; charset=utf-8$/m);
    expect(raw).not.toContain('text/html');
    expect(raw).not.toContain('multipart');
    expect(raw).toContain('<b>not html</b>');
  });

  it('rejects when the transport fails, so the service can report it (E5)', async () => {
    const failing: MailTransport = {
      sendMail: async () => {
        throw new Error('550 mailbox unavailable');
      },
    };

    await expect(new SmtpEmailSender(failing).send(message)).rejects.toThrow('550');
  });

  it('fails fast when no SMTP server is listening', async () => {
    // Grab a free port, then close it, so nothing is listening there.
    const port = await new Promise<number>((resolve) => {
      const server = net.createServer().listen(0, '127.0.0.1', () => {
        const address = server.address();
        server.close(() => resolve(typeof address === 'object' && address ? address.port : 0));
      });
    });
    const sender = new SmtpEmailSender(createSmtpTransport({ host: '127.0.0.1', port }));

    await expect(sender.send(message)).rejects.toThrow();
  });
});
