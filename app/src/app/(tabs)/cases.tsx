import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Case, useCaseStore } from '../../store/CaseStore';
import { colors, spacing } from '../../theme';
import { Button, Card, Empty, Field } from '../../components/ui';

export default function CasesScreen() {
  const { cases, addCase, sessions } = useCaseStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [court, setCourt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!title.trim() || !clientName.trim()) {
      setError('عنوان القضية واسم الموكّل مطلوبان.');
      return;
    }
    addCase({ title: title.trim(), clientName: clientName.trim(), caseNumber: caseNumber.trim(), court: court.trim() });
    setTitle(''); setClientName(''); setCaseNumber(''); setCourt('');
    setError(null);
    setShowForm(false);
  };

  const renderItem = ({ item }: { item: Case }) => {
    const count = sessions.filter((s) => s.caseId === item.id).length;
    return (
      <Pressable onPress={() => router.push(`/case/${item.id}`)}>
        <Card>
          <Text style={styles.caseTitle}>{item.title}</Text>
          <Text style={styles.meta}>الموكّل: {item.clientName}</Text>
          {item.caseNumber ? <Text style={styles.meta}>رقم القضية: {item.caseNumber}</Text> : null}
          {item.court ? <Text style={styles.meta}>المحكمة: {item.court}</Text> : null}
          <Text style={styles.meta}>عدد الجلسات: {count}</Text>
        </Card>
      </Pressable>
    );
  };

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={cases}
      keyExtractor={(c) => c.id}
      renderItem={renderItem}
      ListHeaderComponent={
        <View>
          <Button title={showForm ? 'إلغاء' : '+ قضية جديدة'} variant={showForm ? 'secondary' : 'primary'} onPress={() => setShowForm((v) => !v)} />
          {showForm && (
            <Card style={{ marginTop: spacing.md }}>
              <Field label="عنوان القضية *" value={title} onChangeText={setTitle} />
              <Field label="اسم الموكّل *" value={clientName} onChangeText={setClientName} />
              <Field label="رقم القضية" value={caseNumber} onChangeText={setCaseNumber} />
              <Field label="المحكمة" value={court} onChangeText={setCourt} />
              {error && <Text style={styles.error}>{error}</Text>}
              <Button title="حفظ القضية" onPress={save} />
            </Card>
          )}
          <View style={{ height: spacing.md }} />
        </View>
      }
      ListEmptyComponent={showForm ? undefined : <Empty text="لا توجد قضايا بعد. أضف أول قضية للبدء." />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  caseTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'right', marginBottom: spacing.xs },
  meta: { fontSize: 14, color: colors.muted, textAlign: 'right', marginTop: 2 },
  error: { color: colors.danger, textAlign: 'right', marginBottom: spacing.md },
});
