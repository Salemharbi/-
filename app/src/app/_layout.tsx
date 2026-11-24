import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { CaseStoreProvider } from '../store/CaseStore';
import { colors } from '../theme';

// الواجهة من اليمين إلى اليسار. قد يتطلب التغيير إعادة تشغيل التطبيق مرة واحدة.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  return (
    <CaseStoreProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="case/[id]" options={{ title: 'تفاصيل القضية' }} />
      </Stack>
    </CaseStoreProvider>
  );
}
