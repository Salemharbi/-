import { Tabs } from 'expo-router';
import { colors } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="consult" options={{ title: 'الاستشارات' }} />
      <Tabs.Screen name="documents" options={{ title: 'المستندات' }} />
      <Tabs.Screen name="cases" options={{ title: 'القضايا' }} />
      <Tabs.Screen name="sessions" options={{ title: 'الجلسات' }} />
    </Tabs>
  );
}
