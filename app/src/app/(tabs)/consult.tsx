import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { ChatMessage, askLegalAssistant, isAIConfigured } from '../../services/ai';
import { colors, spacing } from '../../theme';
import { Button } from '../../components/ui';

const GREETING: ChatMessage = {
  role: 'assistant',
  content: 'أهلاً بك. اكتب سؤالك القانوني وسأساعدك بالمعلومات العامة. هذه المعلومات لا تغني عن استشارة محامٍ مرخّص.',
};

export default function ConsultScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const reply = await askLegalAssistant(next.filter((m) => m !== GREETING));
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'حدث خطأ غير متوقع.';
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {!isAIConfigured() && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>الخادم غير مُعدّ بعد: اضبط EXPO_PUBLIC_API_URL لتفعيل الإجابات.</Text>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.bubbleText, item.role === 'user' && styles.userText]}>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="اكتب سؤالك القانوني..."
          placeholderTextColor={colors.muted}
          multiline
          textAlign="right"
        />
        <Pressable onPress={send} disabled={loading || !input.trim()} style={[styles.send, (loading || !input.trim()) && { opacity: 0.5 }]}>
          <Text style={styles.sendText}>{loading ? '...' : 'إرسال'}</Text>
        </Pressable>
      </View>
      <View style={styles.footer}>
        <Button title="مسح المحادثة" variant="secondary" onPress={() => setMessages([GREETING])} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  notice: { backgroundColor: '#FFF7E0', padding: spacing.md },
  noticeText: { color: '#7A5A00', textAlign: 'right', fontSize: 13 },
  list: { padding: spacing.lg, gap: spacing.md },
  bubble: { maxWidth: '85%', borderRadius: 14, padding: spacing.md },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleText: { fontSize: 16, lineHeight: 24, color: colors.text, textAlign: 'right' },
  userText: { color: '#fff' },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 16, color: colors.text },
  send: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: spacing.lg, height: 44, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
  footer: { padding: spacing.md, backgroundColor: colors.card },
});
