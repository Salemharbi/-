import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { today } from '../theme';

export type Case = {
  id: string;
  title: string;
  clientName: string;
  caseNumber: string;
  court: string;
  createdAt: string;
};

export type Session = {
  id: string;
  caseId: string;
  date: string; // YYYY-MM-DD
  time: string;
  attended: boolean | null; // null = لم يُحدَّد بعد
  outcome: string; // التغذية الراجعة / نتيجة الجلسة
};

type Store = {
  ready: boolean;
  cases: Case[];
  sessions: Session[];
  addCase: (input: Pick<Case, 'title' | 'clientName' | 'caseNumber' | 'court'>) => Case;
  removeCase: (id: string) => void;
  addSession: (input: Pick<Session, 'caseId' | 'date' | 'time'>) => void;
  updateSession: (id: string, patch: Partial<Pick<Session, 'attended' | 'outcome'>>) => void;
};

const STORAGE_KEY = 'smart-lawyer:data:v1';
const StoreContext = createContext<Store | null>(null);

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function CaseStoreProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ready, setReady] = useState(false);

  // تحميل البيانات المحفوظة محلياً
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          setCases(Array.isArray(data.cases) ? data.cases : []);
          setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        }
      } catch {
        // بيانات تالفة: نبدأ من جديد بدل إيقاف التطبيق
      }
      setReady(true);
    })();
  }, []);

  // الحفظ عند كل تغيير بعد اكتمال التحميل
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ cases, sessions })).catch(() => {});
  }, [cases, sessions, ready]);

  const addCase = useCallback<Store['addCase']>((input) => {
    const item: Case = { ...input, id: newId(), createdAt: today() };
    setCases((prev) => [item, ...prev]);
    return item;
  }, []);

  const removeCase = useCallback((id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
    setSessions((prev) => prev.filter((s) => s.caseId !== id));
  }, []);

  const addSession = useCallback<Store['addSession']>((input) => {
    setSessions((prev) => [...prev, { ...input, id: newId(), attended: null, outcome: '' }]);
  }, []);

  const updateSession = useCallback<Store['updateSession']>((id, patch) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const value = useMemo(
    () => ({ ready, cases, sessions, addCase, removeCase, addSession, updateSession }),
    [ready, cases, sessions, addCase, removeCase, addSession, updateSession],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useCaseStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useCaseStore must be used inside CaseStoreProvider');
  return ctx;
}
