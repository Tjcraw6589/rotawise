import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { RotationSetup } from '@/components/RotationSetup';
import { Screen } from '@/components/Screen';
import { localISO } from '@/lib/rotation';
import { defaultSetup, rotationFromSetup } from '@/lib/setup';
import { successHaptic } from '@/services/haptics';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

/** One screen, three taps: schedule, platoon, a day you worked. Then you are done. */
export default function Onboarding() {
  const { spacing } = useTheme();
  const hour12 = useStore((s) => s.settings.hour12);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [setup, setSetup] = useState(() => defaultSetup(localISO()));

  const finish = () => {
    const { rotation, platoon } = rotationFromSetup(setup);
    completeOnboarding(rotation, platoon);
    successHaptic();
  };

  return (
    <Screen
      scroll
      testID="onboarding"
      footer={
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Button label="Show my calendar" size="lg" fullWidth onPress={finish} testID="onboarding-done" />
        </View>
      }
    >
      <View style={{ paddingTop: spacing.xl, paddingBottom: spacing.md }}>
        <AppText variant="title">Rotawise</AppText>
        <AppText variant="h3" tone="muted" style={{ marginTop: spacing.xs }}>
          Your rotation, on your home screen. Pay once. Never a subscription.
        </AppText>
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          No account. Everything stays on this phone.
        </AppText>
      </View>
      <RotationSetup value={setup} onChange={setSetup} hour12={hour12} />
    </Screen>
  );
}
