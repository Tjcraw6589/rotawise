import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { IS_EXPO_GO } from '@/config/monetization';
import { configurePurchases } from '@/services/purchases';
import { startWidgetSync } from '@/services/widgetSync';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

// Modals opened from a link (or a widget tap) still have the tabs underneath to go back to.
export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync().catch(() => undefined);
if (!IS_EXPO_GO) SplashScreen.setOptions({ duration: 250, fade: true });

export default function RootLayout() {
  const onboardingComplete = useStore((s) => s.settings.onboardingComplete);
  const theme = useTheme();

  useEffect(() => {
    // The store reads SQLite synchronously, so data is ready on the first render.
    SplashScreen.hide();
    const stopWidgets = startWidgetSync();
    void configurePurchases((pro) => useStore.getState().setPro(pro));
    return stopWidgets;
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme.colors.background]);

  const modal = { presentation: 'modal', animation: 'slide_from_bottom' } as const;

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Protected guard={!onboardingComplete}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={onboardingComplete}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="rotation" />
          <Stack.Screen name="pro" options={modal} />
          <Stack.Screen name="entry" options={modal} />
          <Stack.Screen name="trades" />
          <Stack.Screen name="overtime" />
          <Stack.Screen name="pay" />
          <Stack.Screen name="leave" />
          <Stack.Screen name="export" />
          <Stack.Screen name="profiles" />
          <Stack.Screen name="widgets" />
          <Stack.Screen name="about" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
