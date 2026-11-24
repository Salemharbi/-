import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Session, useCaseStore } from '../store/CaseStore';
import { colors, spacing } from '../theme';
import { Button, Card, Field } from './ui';

export function SessionRow({ session, caseTitle }: { session: Session; caseTitle?: string }) {
  const { updateSession } = useCaseStore();
  const [outcome, setOutcome] = useState(session.outcome);

  // مزامنة الحقل عند تغيّر البيانات من مكان آخر
  useEffect(() => setOutcome(session.outcome), [session.outcome]);

  const attendanceLabel =
    session.attended === true ? 'حضرت' : session.attended === false ? 'لم أحضر' : 'لم يُحدَّد';

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.date}>
          {session.date}
          {session.time ? ` · ${session.time}` : ''}
        </Text>
        <Text style={[styles.badge, { color: session.attended === true ? colors.success : colors.muted }]}>
          {attendanceLabel}
        </Text>
      </View>
      {caseTitle ? <Text style={styles.caseTitle}>{caseTitle}</Text> : null}

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => updateSession(session.id, { attended: true })}
          style={[styles.toggle, session.attended === true && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, session.attended === true && styles.toggleTextActive]}>حضرت</Text>
        </Pressable>
        <Pressable
          onPress={() => updateSession(session.id, { attended: false })}
          style={[styles.toggle, session.attended === false && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, session.attended === false && styles.toggleTextActive]}>لم أحضر</Text>
        </Pressable>
      </View>

      <Field
        label="التغذية الراجعة / نتيجة الجلسة"
        value={outcome}
        onChangeText={setOutcome}
        multiline
        placeholder="مثال: تأجيل للنطق بالحكم، طلب مستندات إضافية..."
      />
      <Button
        title="حفظ التغذية الراجعة"
        variant="secondary"
        disabled={outcome === session.outcome}
        onPress={() => updateSession(session.id, { outcome: outcome.trim() })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 16, fontWeight: '700', color: colors.text },
  badge: { fontSize: 13, fontWeight: '600' },
  caseTitle: { fontSize: 14, color: colors.muted, textAlign: 'right', marginTop: spacing.xs, marginBottom: spacing.md },
  toggleRow: { flexDirection: 'row-reverse', gap: spacing.sm, marginVertical: spacing.md },
  toggle: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleText: { color: colors.primary, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
});
