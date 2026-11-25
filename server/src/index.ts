// Composition root: the only place that reads config and picks real adapters.
// Changing the data source or email provider means changing this file and adding an adapter.
import { FakeStoreProductRepository } from './adapters/fakeStore/fakeStoreProductRepository.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import type { EmailSender } from './domain/ports.ts';
import { loadFeaturedIds } from './featured.ts';

const config = loadConfig();

// TODO(task 12): replace with the SMTP adapter. Until then enquiries fail with 502.
const notYetConfiguredEmailSender: EmailSender = {
  async send() {
    throw new Error('Email sending is not wired up yet');
  },
};

const app = createApp({
  productRepository: new FakeStoreProductRepository({ baseUrl: config.FAKE_STORE_BASE_URL }),
  emailSender: notYetConfiguredEmailSender,
  emailAddresses: { from: config.EMAIL_FROM, salesInbox: config.SALES_INBOX_EMAIL },
  featuredIds: loadFeaturedIds(),
});

app.listen(config.PORT, () => {
  console.log(`API listening on port ${config.PORT}`);
});
