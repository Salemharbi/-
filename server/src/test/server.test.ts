import Anthropic from '@anthropic-ai/sdk';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../app.js';
import type { Config } from '../config.js';
import { loadConfig } from '../config.js';
import { RateLimiter } from '../http.js';

const TOKEN = 'test-token-0123456789';

type Call = { kind: 'messages' | 'beta'; params: Record<string, unknown> };

function fakeClient(respond: (call: Call) => unknown): { client: Anthropic; calls: Call[] } {
  const calls: Call[] = [];
  const record = (kind: Call['kind']) => async (params: Record<string, unknown>) => {
    const call = { kind, params };
    calls.push(call);
    return respond(call);
  };
  const client = {
    messages: { create: record('messages') },
    beta: { messages: { create: record('beta') } },
  } as unknown as Anthropic;
  return { client, calls };
}

const ok = (text: string, stop = 'end_turn') => ({
  content: [{ type: 'text', text }],
  stop_reason: stop,
});

function config(over: Partial<Config> = {}): Config {
  return {
    apiKey: 'sk-test',
    model: 'claude-opus-5-5',
    appToken: TOKEN,
    port: 0,
    refusalFallback: true,
    rateLimitPerMinute: 100,
    ...over,
  };
}

async function start(cfg: Config, client?: Anthropic) {
  const server = createApp({ config: cfg, client, log: () => {} });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const { port } = server.address() as AddressInfo;
  return { server, base: `http://127.0.0.1:${port}` };
}

const close = (server: ReturnType<typeof createApp>) => new Promise<void>((resolve) => server.close(() => resolve()));

async function post(base: string, path: string, body: unknown, token: string | null = TOKEN) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe('config', () => {
  it('يرفض رمز التطبيق القصير أو غير المضبوط', () => {
    assert.throws(() => loadConfig({}), /APP_API_TOKEN/);
    assert.throws(() => loadConfig({ APP_API_TOKEN: 'short' }), /APP_API_TOKEN/);
  });
  it('يطبّق القيم الافتراضية', () => {
    const c = loadConfig({ APP_API_TOKEN: TOKEN });
    assert.equal(c.model, 'claude-opus-5-5');
    assert.equal(c.refusalFallback, true);
    assert.equal(c.port, 8787);
  });
});

describe('rate limiter', () => {
  it('يمنع ما يتجاوز الحد خلال الدقيقة ثم يسمح بعدها', () => {
    let now = 0;
    const rl = new RateLimiter(2, () => now);
    assert.equal(rl.allow('a'), true);
    assert.equal(rl.allow('a'), true);
    assert.equal(rl.allow('a'), false);
    now = 61_000;
    assert.equal(rl.allow('a'), true);
  });
});

describe('HTTP API', () => {
  let server: ReturnType<typeof createApp>;
  let base: string;
  let calls: Call[];
  let respond: (call: Call) => unknown = () => ok('');

  before(async () => {
    const fc = fakeClient((call) => respond(call));
    calls = fc.calls;
    ({ server, base } = await start(config(), fc.client));
  });
  after(() => close(server));

  it('يعيد 200 على /health دون رمز', async () => {
    const res = await fetch(base + '/health');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, aiConfigured: true });
  });

  it('يرفض الطلبات بدون رمز صحيح', async () => {
    assert.equal((await post(base, '/legal/chat', {}, null)).status, 401);
    assert.equal((await post(base, '/legal/chat', {}, 'wrong-token-0000000000')).status, 401);
  });

  it('يرجع 404 لمسار غير معروف', async () => {
    assert.equal((await post(base, '/unknown', {})).status, 404);
  });

  it('يتحقق من رسائل المحادثة', async () => {
    const startsAssistant = await post(base, '/legal/chat', { messages: [{ role: 'assistant', content: 'hi' }] });
    assert.equal(startsAssistant.status, 400);
    const endsAssistant = await post(base, '/legal/chat', {
      messages: [
        { role: 'user', content: 'سؤال' },
        { role: 'assistant', content: 'جواب' },
      ],
    });
    assert.equal(endsAssistant.status, 400);
    const badRole = await post(base, '/legal/chat', { messages: [{ role: 'system', content: 'x' }] });
    assert.equal(badRole.status, 400);
  });

  it('يرسل المحادثة إلى Claude مع النموذج الاحتياطي عند الرفض', async () => {
    calls.length = 0;
    respond = () => ok('الجواب العام');
    const res = await post(base, '/legal/chat', { messages: [{ role: 'user', content: 'ما هي مدة التقادم؟' }] });
    assert.equal(res.status, 200);
    assert.equal(res.json.reply, 'الجواب العام');
    assert.equal(res.json.refused, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].kind, 'beta');
    assert.equal(calls[0].params.model, 'claude-opus-5-5');
    assert.deepEqual(calls[0].params.betas, ['server-side-fallback-2026-07-01']);
    assert.equal(calls[0].params.fallbacks, 'default');
    assert.equal(calls[0].params.max_tokens, 4000);
  });

  it('يعيد رسالة الرفض بدل المحتوى عندما يرفض النموذج', async () => {
    respond = () => ({ content: [], stop_reason: 'refusal' });
    const res = await post(base, '/legal/chat', { messages: [{ role: 'user', content: 'سؤال' }] });
    assert.equal(res.status, 200);
    assert.equal(res.json.refused, true);
    assert.match(String(res.json.reply), /تعذّر/);
  });

  it('يحلل المستند ويتحقق من شكل JSON الناتج', async () => {
    respond = () => ok(JSON.stringify({ summary: 'عقد إيجار', keyPoints: ['مدة سنة'], risks: ['لا توجد غرامة تأخير'] }));
    const res = await post(base, '/legal/analyze', { text: 'نص العقد' });
    assert.equal(res.status, 200);
    assert.equal(res.json.summary, 'عقد إيجار');
    assert.deepEqual(res.json.keyPoints, ['مدة سنة']);
  });

  it('يرفض ناتج تحليل ليس JSON صالحاً', async () => {
    respond = () => ok('ليس JSON');
    assert.equal((await post(base, '/legal/analyze', { text: 'نص' })).status, 502);
  });

  it('يرفض ناتج تحليل بشكل خاطئ', async () => {
    respond = () => ok(JSON.stringify({ summary: 'x' }));
    assert.equal((await post(base, '/legal/analyze', { text: 'نص' })).status, 502);
  });

  it('يتحقق من نص المستند الفارغ', async () => {
    assert.equal((await post(base, '/legal/analyze', { text: '   ' })).status, 400);
  });
});

describe('without API key', () => {
  it('يعيد 503 ولا يحاول الاتصال بـ Anthropic', async () => {
    const { server, base } = await start(config({ apiKey: undefined }));
    try {
      const health = await fetch(base + '/health');
      assert.deepEqual(await health.json(), { ok: true, aiConfigured: false });
      const res = await post(base, '/legal/chat', { messages: [{ role: 'user', content: 'سؤال' }] });
      assert.equal(res.status, 503);
      assert.equal(res.json.error, 'not_configured');
    } finally {
      await close(server);
    }
  });
});

describe('fallback off', () => {
  it('يستخدم Messages العادية بلا النموذج الاحتياطي', async () => {
    const fc = fakeClient(() => ok('رد'));
    const { server, base } = await start(config({ refusalFallback: false }), fc.client);
    try {
      const res = await post(base, '/legal/chat', { messages: [{ role: 'user', content: 'سؤال' }] });
      assert.equal(res.status, 200);
      assert.equal(fc.calls[0].kind, 'messages');
      assert.equal('fallbacks' in fc.calls[0].params, false);
    } finally {
      await close(server);
    }
  });
});
