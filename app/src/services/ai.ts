/**
 * واجهة الذكاء الاصطناعي.
 * لا يحتوي التطبيق على أي مفتاح API؛ كل الطلبات تمر عبر خادم خاص بك
 * يعرّفه المتغير EXPO_PUBLIC_API_URL (مثال: https://api.example.com).
 * الخادم هو من يستدعي نموذج Claude ويحفظ المفتاح.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN;

export class AIUnavailableError extends Error {}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type DocumentAnalysis = {
  summary: string;
  keyPoints: string[];
  risks: string[];
};

export const isAIConfigured = () => Boolean(BASE_URL);

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!BASE_URL) {
    throw new AIUnavailableError('خدمة الذكاء الاصطناعي غير مُعدّة بعد. يلزم ضبط EXPO_PUBLIC_API_URL.');
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(APP_TOKEN ? { Authorization: `Bearer ${APP_TOKEN}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`تعذّر إكمال الطلب (رمز ${res.status}).`);
  return (await res.json()) as T;
}

export async function askLegalAssistant(messages: ChatMessage[]): Promise<string> {
  const data = await post<{ reply: string }>('/legal/chat', { messages });
  return data.reply;
}

export function analyzeDocument(text: string): Promise<DocumentAnalysis> {
  return post<DocumentAnalysis>('/legal/analyze', { text });
}
