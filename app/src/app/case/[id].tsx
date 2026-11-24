import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SessionRow } from '../../components/SessionRow';
import { Button, Card, Empty, Field } from '../../components/ui';
import { useCaseStore } from '../../store/CaseStore';
import { colors, isValidDate, spacing, today } from '../../theme';

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cases, sessions, addSession, removeCase } = useCaseStore();
  const item = cases.find((c) => c.id === id);

  const [date, setDate] = useState(today());
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!item) {
    return (
      <>
        <Stack.Screen options={{ title: 'تفاصيل القضية' }} />
        <Empty text="هذه القضية غير موجودة." />
      </>
    );
  }

  const caseSessions = sessions
    .filter((s) => s.caseId === item.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const saveSession = () => {
    if (!isValidDate(date)) {
      setError('التاريخ يجب أن يكون بصيغة YYYY-MM-DD، مثل 2026-12-01.');
      return;
    }
    addSession({ caseId: item.id, date, time: time.trim() });
    setTime('');
    setError(null);
  };

  const confirmRemove = () => {
    removeCase(item.id);
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: item.title }} />
      <Card>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>الموكّل: {item.clientName}</Text>
        {item.caseNumber ? <Text style={styles.meta}>رقم القضية: {item.caseNumber}</Text> : null}
        {item.court ? <Text style={styles.meta}>المحكمة: {item.court}</Text> : null}
      </Card>

      <Text style={styles.section}>إضافة جلسة</Text>
      <Card>
        <Field label="التاريخ (YYYY-MM-DD)" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
        <Field label="الوقت (اختياري)" value={time} onChangeText={setTime} placeholder="مثال: 10:30" />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button title="إضافة الجلسة" onPress={saveSession} />
      </Card>

      <Text style={styles.section}>الجلسات</Text>
      {caseSessions.length === 0 ? (
        <Empty text="لا توجد جلسات لهذه القضية." />
      ) : (
        caseSessions.map((s) => <SessionRow key={s.id} session={s} />)
      )}

      <Button title="حذف القضية" variant="danger" onPress={confirmRemove} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'right', marginBottom: spacing.sm },
  meta: { fontSize: 14, color: colors.muted, textAlign: 'right', marginTop: 2 },
  section: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'right', marginVertical: spacing.md },
  error: { color: colors.danger, textAlign: 'right', marginBottom: spacing.md },
});
