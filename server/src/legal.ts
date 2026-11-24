import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { ANALYZE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT, REFUSAL_MESSAGE } from './prompts.js';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  risks: string[];
}

export interface LegalServiceOptions {
  client: Anthropic;
  model: string;
  refusalFallback: boolean;
}

// الاستجابة المشتركة بين Messages وBeta Messages، نقرأ منها ما نحتاجه فقط
interface ModelResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason: string | null;
}

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const AnalysisSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  risks: z.array(z.string()),
});

const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    keyPoints: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'keyPoints', 'risks'],
  additionalProperties: false,
};

function textOf(res: ModelResponse): string {
  return res.content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('\n')
    .trim();
}

export class LegalService {
  constructor(private readonly opts: LegalServiceOptions) {}

  /** ينفذ طلب Messages، ويحوّل الرفض إلى نموذج احتياطي عند تفعيله. */
  private async send(params: Anthropic.MessageCreateParamsNonStreaming): Promise<ModelResponse> {
    if (this.opts.refusalFallback) {
      // الصيغة المختصرة "default": يختار النموذج الاحتياطي حسب فئة الرفض
      const res = await this.opts.client.beta.messages.create({
        ...params,
        betas: [FALLBACK_BETA],
        fallbacks: 'default',
      } as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming);
      return res as unknown as ModelResponse;
    }
    return (await this.opts.client.messages.create(params)) as unknown as ModelResponse;
  }

  async chat(messages: ChatMessage[]): Promise<{ reply: string; refused: boolean }> {
    const res = await this.send({
      model: this.opts.model,
      max_tokens: 4000,
      output_config: { effort: 'medium' },
      system: CHAT_SYSTEM_PROMPT,
      messages,
    });
    if (res.stop_reason === 'refusal') return { reply: REFUSAL_MESSAGE, refused: true };
    const reply = textOf(res);
    if (!reply) throw new Error('empty_model_reply');
    return { reply, refused: false };
  }

  async analyze(text: string): Promise<DocumentAnalysis & { refused: boolean }> {
    const res = await this.send({
      model: this.opts.model,
      max_tokens: 8000,
      output_config: {
        effort: 'high',
        format: { type: 'json_schema', schema: ANALYSIS_JSON_SCHEMA },
      },
      system: ANALYZE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `نص المستند:\n<document>\n${text}\n</document>` }],
    });
    if (res.stop_reason === 'refusal') {
      return { summary: REFUSAL_MESSAGE, keyPoints: [], risks: [], refused: true };
    }
    let raw: unknown;
    try {
      raw = JSON.parse(textOf(res));
    } catch {
      throw new Error('invalid_model_json');
    }
    const parsed = AnalysisSchema.safeParse(raw);
    if (!parsed.success) throw new Error('invalid_model_shape');
    return { ...parsed.data, refused: false };
  }
}
