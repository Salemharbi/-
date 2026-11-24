export interface Config {
  apiKey: string | undefined;
  model: string;
  appToken: string;
  port: number;
  refusalFallback: boolean;
  rateLimitPerMinute: number;
}

const DEFAULT_MODEL = 'claude-opus-5-5';

/** يقرأ الإعدادات من البيئة ويرفض البدء إن كان رمز التطبيق غير مضبوط. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const appToken = (env.APP_API_TOKEN ?? '').trim();
  if (appToken.length < 16) {
    throw new Error('APP_API_TOKEN غير مضبوط أو أقصر من 16 حرفاً. اضبطه قبل تشغيل الخادم.');
  }
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT غير صالح.');
  }
  const rate = Number(env.RATE_LIMIT_PER_MINUTE ?? 30);
  if (!Number.isInteger(rate) || rate <= 0) {
    throw new Error('RATE_LIMIT_PER_MINUTE غير صالح.');
  }
  const fallback = (env.REFUSAL_FALLBACK ?? 'default').trim();
  if (fallback !== 'default' && fallback !== 'off') {
    throw new Error('REFUSAL_FALLBACK يجب أن يكون default أو off.');
  }
  return {
    apiKey: env.ANTHROPIC_API_KEY?.trim() || undefined,
    model: env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL,
    appToken,
    port,
    refusalFallback: fallback === 'default',
    rateLimitPerMinute: rate,
  };
}
