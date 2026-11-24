import Anthropic from '@anthropic-ai/sdk';
import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Config } from './config.js';
import { BodyTooLargeError, InvalidJsonError, RateLimiter, readJsonBody, sendJson } from './http.js';
import { LegalService } from './legal.js';
import { LIMITS, ValidationError, parseAnalyzeBody, parseChatBody } from './validate.js';

export interface AppDeps {
  config: Config;
  /** يُمرَّر في الاختبارات؛ في الإنتاج يُنشأ من مفتاح البيئة */
  client?: Anthropic;
  log?: (line: string) => void;
}

function tokenMatches(header: string | undefined, expected: string): boolean {
  const prefix = 'Bearer ';
  if (!header || !header.startsWith(prefix)) return false;
  const given = Buffer.from(header.slice(prefix.length).trim());
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

function clientIp(req: IncomingMessage): string {
  return req.socket.remoteAddress ?? 'unknown';
}

/** يحوّل أخطاء SDK والتحقق إلى رموز HTTP دون تسريب تفاصيل داخلية. */
function errorResponse(err: unknown): { status: number; error: string; message: string } {
  if (err instanceof ValidationError) return { status: 400, error: 'invalid_request', message: err.message };
  if (err instanceof InvalidJsonError) return { status: 400, error: 'invalid_json', message: 'الجسم ليس JSON صالحاً.' };
  if (err instanceof BodyTooLargeError) return { status: 413, error: 'payload_too_large', message: 'حجم الطلب كبير جداً.' };
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 503, error: 'upstream_busy', message: 'الخدمة مشغولة حالياً، حاول بعد قليل.' };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 503, error: 'upstream_unreachable', message: 'تعذّر الوصول إلى خدمة الذكاء الاصطناعي.' };
  }
  if (err instanceof Anthropic.APIError) {
    return { status: 502, error: 'upstream_error', message: 'خدمة الذكاء الاصطناعي أعادت خطأ.' };
  }
  return { status: 502, error: 'model_error', message: 'تعذّر إكمال الطلب.' };
}

export function createApp(deps: AppDeps): Server {
  const { config } = deps;
  const log = deps.log ?? ((line: string) => console.log(line));
  const limiter = new RateLimiter(config.rateLimitPerMinute);

  // بدون مفتاح لا نحاول الاتصال بـ Anthropic أصلاً
  const client =
    deps.client ?? (config.apiKey ? new Anthropic({ apiKey: config.apiKey, maxRetries: 2, timeout: 120_000 }) : undefined);
  const legal = client
    ? new LegalService({ client, model: config.model, refusalFallback: config.refusalFallback })
    : undefined;

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    if (method === 'GET' && url === '/health') {
      return sendJson(res, 200, { ok: true, aiConfigured: Boolean(legal) });
    }

    if (!tokenMatches(req.headers.authorization, config.appToken)) {
      return sendJson(res, 401, { error: 'unauthorized', message: 'رمز الوصول غير صحيح.' });
    }
    if (!limiter.allow(config.appToken.slice(0, 8) + clientIp(req))) {
      return sendJson(res, 429, { error: 'rate_limited', message: 'عدد الطلبات كبير، حاول لاحقاً.' });
    }

    if (method !== 'POST' || (url !== '/legal/chat' && url !== '/legal/analyze')) {
      return sendJson(res, 404, { error: 'not_found', message: 'المسار غير موجود.' });
    }
    if (!legal) {
      return sendJson(res, 503, { error: 'not_configured', message: 'خدمة الذكاء الاصطناعي غير مُعدّة على الخادم.' });
    }

    const body = await readJsonBody(req, LIMITS.maxBodyBytes);
    if (url === '/legal/chat') {
      const messages = parseChatBody(body);
      const result = await legal.chat(messages);
      return sendJson(res, 200, { reply: result.reply, refused: result.refused });
    }
    const text = parseAnalyzeBody(body);
    const analysis = await legal.analyze(text);
    return sendJson(res, 200, analysis);
  }

  return createServer((req, res) => {
    const started = Date.now();
    handle(req, res)
      .catch((err: unknown) => {
        const mapped = errorResponse(err);
        if (mapped.status >= 500) {
          // نسجل نوع الخطأ فقط، لا محتوى الطلب ولا المفتاح
          log(`error ${mapped.error}: ${err instanceof Error ? err.name : 'unknown'}`);
        }
        if (!res.headersSent) sendJson(res, mapped.status, { error: mapped.error, message: mapped.message });
      })
      .finally(() => {
        log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - started}ms`);
      });
  });
}
