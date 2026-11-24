import type { ChatMessage } from './legal.js';

export class ValidationError extends Error {}

export const LIMITS = {
  maxBodyBytes: 1_000_000,
  maxMessages: 40,
  maxMessageChars: 8_000,
  maxTotalChars: 60_000,
  maxDocumentChars: 150_000,
};

export function parseChatBody(body: unknown): ChatMessage[] {
  if (!body || typeof body !== 'object') throw new ValidationError('الطلب يجب أن يكون كائن JSON.');
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError('الحقل messages مطلوب ويجب أن يحتوي رسالة واحدة على الأقل.');
  }
  if (messages.length > LIMITS.maxMessages) {
    throw new ValidationError(`عدد الرسائل يتجاوز الحد (${LIMITS.maxMessages}).`);
  }
  let total = 0;
  const out: ChatMessage[] = messages.map((m, i) => {
    if (!m || typeof m !== 'object') throw new ValidationError(`الرسالة رقم ${i + 1} غير صالحة.`);
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role !== 'user' && role !== 'assistant') {
      throw new ValidationError(`دور الرسالة رقم ${i + 1} يجب أن يكون user أو assistant.`);
    }
    if (typeof content !== 'string' || content.trim() === '') {
      throw new ValidationError(`محتوى الرسالة رقم ${i + 1} مطلوب.`);
    }
    if (content.length > LIMITS.maxMessageChars) {
      throw new ValidationError(`الرسالة رقم ${i + 1} أطول من الحد المسموح.`);
    }
    total += content.length;
    return { role, content: content.trim() };
  });
  if (total > LIMITS.maxTotalChars) throw new ValidationError('مجموع أحجام الرسائل يتجاوز الحد المسموح.');
  if (out[0].role !== 'user') throw new ValidationError('يجب أن تبدأ المحادثة برسالة من المستخدم.');
  if (out[out.length - 1].role !== 'user') throw new ValidationError('يجب أن تنتهي المحادثة برسالة من المستخدم.');
  return out;
}

export function parseAnalyzeBody(body: unknown): string {
  if (!body || typeof body !== 'object') throw new ValidationError('الطلب يجب أن يكون كائن JSON.');
  const text = (body as { text?: unknown }).text;
  if (typeof text !== 'string' || text.trim() === '') throw new ValidationError('الحقل text مطلوب.');
  if (text.length > LIMITS.maxDocumentChars) {
    throw new ValidationError(`المستند أطول من الحد المسموح (${LIMITS.maxDocumentChars} حرف).`);
  }
  return text.trim();
}
