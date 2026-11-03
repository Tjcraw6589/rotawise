import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Fraction of the screen height the sheet may grow to. */
  maxHeightRatio?: number;
  testID?: string;
}

/** How far (points) or how fast a downward drag on the grabber has to be to close the sheet. */
const CLOSE_DISTANCE = 90;
const CLOSE_VELOCITY = 0.8;

/**
 * Bottom sheet built on the core Modal so it behaves the same on iOS, Android and web.
 * It closes with the X, a tap outside, a swipe down on the grabber, or the VoiceOver escape gesture.
 */
export function Sheet({ visible, onClose, title, children, maxHeightRatio = 0.85, testID }: SheetProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [drag] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) drag.setValue(0);
  }, [visible, drag]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) onClose();
          else Animated.spring(drag, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
        },
        onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start(),
      }),
    [drag, onClose],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={onClose} />
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            maxHeight: `${Math.round(maxHeightRatio * 100)}%`,
            transform: [{ translateY: drag }],
          }}
        >
          <View {...pan.panHandlers} testID={testID ? `${testID}-grabber` : undefined}>
            <View style={styles.grabArea}>
              <View style={[styles.handle, { backgroundColor: colors.textFaint }]} />
            </View>
            {title ? (
              <View style={[styles.header, { paddingHorizontal: spacing.lg, marginBottom: spacing.sm }]}>
                <AppText variant="h3" accessibilityRole="header" style={styles.title}>
                  {title}
                </AppText>
                <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} testID={testID ? `${testID}-close` : undefined}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null}
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  grabArea: { alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
  handle: { width: 40, height: 5, borderRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, marginRight: 12 },
});
