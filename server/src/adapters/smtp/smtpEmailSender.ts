// The only code that knows Nodemailer. Swapping to AWS SES or another provider
// means a new EmailSender adapter and a change in src/index.ts.
import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailMessage, EmailSender } from '../../domain/ports.ts';

export type SmtpOptions = {
  host: string;
  port: number;
};

/** Just what we use from Nodemailer, so tests can pass a stub. */
export type MailTransport = Pick<Transporter, 'sendMail'>;

export function createSmtpTransport({ host, port }: SmtpOptions): MailTransport {
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // implicit TLS port; others upgrade with STARTTLS when offered
    // Fail fast instead of Nodemailer's 2-minute default, so the customer sees
    // "please try again" (E5) rather than a hanging form.
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });
}

export class SmtpEmailSender implements EmailSender {
  private readonly transport: MailTransport;

  constructor(transport: MailTransport) {
    this.transport = transport;
  }

  /** E4: plain text only; there is no `html` part. Rejects if the server refuses it. */
  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: message.from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
    });
  }
}
