import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={24} color={typeof color === 'string' ? color : undefined} />;
  };
}

const TAB_BAR_CONTENT_HEIGHT = 64;

export default function TabsLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.border, height: TAB_BAR_CONTENT_HEIGHT + insets.bottom },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', lineHeight: 15 },
        // Like the native iOS tab bar, labels keep their size at large text settings instead of being cut off.
        tabBarAllowFontScaling: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('today', 'today-outline'), tabBarButtonTestID: 'tab-today' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Month', tabBarIcon: icon('calendar', 'calendar-outline'), tabBarButtonTestID: 'tab-calendar' }} />
      <Tabs.Screen name="year" options={{ title: 'Year', tabBarIcon: icon('grid', 'grid-outline'), tabBarButtonTestID: 'tab-year' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools', tabBarIcon: icon('briefcase', 'briefcase-outline'), tabBarButtonTestID: 'tab-tools' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings', 'settings-outline'), tabBarButtonTestID: 'tab-settings' }} />
    </Tabs>
  );
}
