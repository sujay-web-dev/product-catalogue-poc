// Composition root: the only place that reads config and picks real adapters.
// Changing the data source or email provider means changing this file and adding an adapter.
import { FakeStoreProductRepository } from './adapters/fakeStore/fakeStoreProductRepository.ts';
import { createSmtpTransport, SmtpEmailSender } from './adapters/smtp/smtpEmailSender.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { loadFeaturedIds } from './featured.ts';

const config = loadConfig();

const app = createApp({
  productRepository: new FakeStoreProductRepository({ baseUrl: config.FAKE_STORE_BASE_URL }),
  emailSender: new SmtpEmailSender(
    createSmtpTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT }),
  ),
  emailAddresses: { from: config.EMAIL_FROM, salesInbox: config.SALES_INBOX_EMAIL },
  featuredIds: loadFeaturedIds(),
  logRequests: true,
});

app.listen(config.PORT, () => {
  console.log(`API listening on port ${config.PORT}`);
});
