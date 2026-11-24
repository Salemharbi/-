import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SessionRow } from '../../components/SessionRow';
import { Empty } from '../../components/ui';
import { useCaseStore } from '../../store/CaseStore';
import { colors, spacing } from '../../theme';

export default function SessionsScreen() {
  const { sessions, cases } = useCaseStore();
  // الأقرب أولاً
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={sorted}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <SessionRow session={item} caseTitle={cases.find((c) => c.id === item.caseId)?.title} />
      )}
      ListEmptyComponent={<Empty text="لا توجد جلسات مسجّلة. أضف جلسة من صفحة القضية." />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
});
