import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { DocumentAnalysis, analyzeDocument, AIUnavailableError } from '../../services/ai';
import { DocumentTemplate, fillTemplate, templates } from '../../data/templates';
import { colors, spacing } from '../../theme';
import { Button, Card, Field } from '../../components/ui';

export default function DocumentsScreen() {
  const [selected, setSelected] = useState<DocumentTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickTemplate = (t: DocumentTemplate) => {
    setSelected(t);
    setValues({});
  };

  const pickAndAnalyze = async () => {
    setError(null);
    setAnalysis(null);
    const result = await DocumentPicker.getDocumentAsync({ type: 'text/plain', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setFileName(asset.name);
    setAnalyzing(true);
    try {
      const text = await (await fetch(asset.uri)).text();
      setAnalysis(await analyzeDocument(text));
    } catch (e) {
      setError(e instanceof AIUnavailableError || e instanceof Error ? e.message : 'تعذّر التحليل.');
    } finally {
      setAnalyzing(false);
    }
  };

  const output = selected ? fillTemplate(selected, values) : '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.section}>صياغة من قالب</Text>
      <View style={styles.chips}>
        {templates.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => pickTemplate(t)}
            style={[styles.chip, selected?.id === t.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, selected?.id === t.id && styles.chipTextActive]}>{t.title}</Text>
          </Pressable>
        ))}
      </View>

      {selected && (
        <Card>
          {selected.fields.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              value={values[f.key] ?? ''}
              onChangeText={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
            />
          ))}
          <Text style={styles.preview} selectable>{output}</Text>
          <Text style={styles.warning}>هذا قالب عام ويجب مراجعته من محامٍ مرخّص قبل الاعتماد.</Text>
        </Card>
      )}

      <Text style={styles.section}>تحليل مستند</Text>
      <Card>
        <Text style={styles.hint}>اختر ملف نصي (.txt) لتلخيصه واستخراج النقاط المهمة والمخاطر.</Text>
        <Button title="اختيار ملف" onPress={pickAndAnalyze} loading={analyzing} />
        {fileName && <Text style={styles.fileName}>الملف: {fileName}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {analysis && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.subhead}>الملخص</Text>
            <Text style={styles.body}>{analysis.summary}</Text>
            <Text style={styles.subhead}>النقاط المهمة</Text>
            {analysis.keyPoints.map((p, i) => <Text key={i} style={styles.body}>• {p}</Text>)}
            <Text style={styles.subhead}>المخاطر المحتملة</Text>
            {analysis.risks.map((r, i) => <Text key={i} style={[styles.body, { color: colors.danger }]}>• {r}</Text>)}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  section: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'right', marginBottom: spacing.md, marginTop: spacing.sm },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  preview: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.bg, borderRadius: 10, fontSize: 15, lineHeight: 24, color: colors.text, textAlign: 'right' },
  warning: { marginTop: spacing.md, fontSize: 13, color: colors.muted, textAlign: 'right' },
  hint: { color: colors.muted, textAlign: 'right', marginBottom: spacing.md, fontSize: 14 },
  fileName: { marginTop: spacing.sm, color: colors.muted, textAlign: 'right' },
  error: { marginTop: spacing.md, color: colors.danger, textAlign: 'right' },
  subhead: { fontWeight: '700', color: colors.text, textAlign: 'right', marginTop: spacing.md, marginBottom: spacing.xs },
  body: { color: colors.text, textAlign: 'right', lineHeight: 22, marginBottom: spacing.xs },
});
