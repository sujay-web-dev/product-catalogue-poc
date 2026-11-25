// Composition root: the only place that reads config and picks real adapters.
// Changing the data source means changing this file and adding an adapter.
import { FakeStoreProductRepository } from './adapters/fakeStore/fakeStoreProductRepository.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { loadFeaturedIds } from './featured.ts';

const config = loadConfig();

const app = createApp({
  productRepository: new FakeStoreProductRepository({ baseUrl: config.FAKE_STORE_BASE_URL }),
  featuredIds: loadFeaturedIds(),
});

app.listen(config.PORT, () => {
  console.log(`API listening on port ${config.PORT}`);
});
