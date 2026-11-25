import { createApp, type AppDeps } from '../app.ts';
import { FakeEmailSender } from './fakeEmailSender.ts';
import { InMemoryProductRepository } from './inMemoryProductRepository.ts';

export const testEmailAddresses = {
  from: 'no-reply@shop.test',
  salesInbox: 'sales@shop.test',
};

/** The real app wired with fakes; override any dependency per test. */
export function createTestApp(overrides: Partial<AppDeps> = {}) {
  return createApp({
    productRepository: new InMemoryProductRepository(),
    emailSender: new FakeEmailSender(),
    emailAddresses: testEmailAddresses,
    featuredIds: [],
    ...overrides,
  });
}
