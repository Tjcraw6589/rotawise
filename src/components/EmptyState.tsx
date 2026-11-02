import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

export function EmptyState({ message, testID }: { message: string; testID?: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View testID={testID} style={{ padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border }}>
      <AppText variant="body" tone="muted" align="center">
        {message}
      </AppText>
    </View>
  );
}
