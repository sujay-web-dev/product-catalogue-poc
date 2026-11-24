// Composition root: the only place that reads config and wires real adapters.
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();

createApp().listen(config.PORT, () => {
  console.log(`API listening on port ${config.PORT}`);
});
