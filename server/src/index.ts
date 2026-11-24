import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const server = createApp({ config });

server.listen(config.port, () => {
  const ai = config.apiKey ? `model=${config.model}` : 'AI غير مُعدّ (ANTHROPIC_API_KEY فارغ)';
  console.log(`المحامي الذكي: الخادم يعمل على المنفذ ${config.port} — ${ai}`);
});
