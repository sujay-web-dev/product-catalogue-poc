import type { EmailMessage, EmailSender } from '../domain/ports.ts';

/** Test double for EmailSender: records messages, or fails when told to (E5). */
export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  shouldFail = false;

  async send(message: EmailMessage): Promise<void> {
    if (this.shouldFail) throw new Error('Email provider unavailable');
    this.sent.push(message);
  }
}
