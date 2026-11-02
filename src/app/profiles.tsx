import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { Header } from '@/components/Header';
import { PlatoonBadge } from '@/components/PlatoonBadge';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { useProGate } from '@/hooks/useData';
import type { Profile } from '@/lib/model';
import { PROFILE_COLORS } from '@/lib/model';
import { presetInfo } from '@/lib/rotation';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

export default function ProfilesScreen() {
  const { colors, radius, spacing } = useTheme();
  const router = useRouter();
  const { requirePro } = useProGate();
  const profiles = useStore((s) => s.profiles);
  const activeId = useStore((s) => s.settings.activeProfileId);
  const overlayIds = useStore((s) => s.settings.overlayProfileIds);
  const setActive = useStore((s) => s.setActiveProfile);
  const toggleOverlay = useStore((s) => s.toggleOverlay);
  const updateProfile = useStore((s) => s.updateProfile);
  const removeProfile = useStore((s) => s.removeProfile);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(false);

  return (
    <Screen scroll testID="profiles-screen">
      <Header title="Rotations" dismiss="back" />
      <AppText variant="body" tone="muted">
        Keep a second job or a partner&apos;s rotation here. The one marked Showing drives Today, the calendars and the widgets. Turn on Overlay to see another rotation on top of yours in the month view.
      </AppText>
      {profiles.map((p) => {
        const active = p.id === activeId;
        return (
          <Card key={p.id} style={{ marginTop: spacing.md }} padded={false} testID={`profile-${p.id}`}>
            <View style={[styles.head, { padding: spacing.md }]}>
              <View style={[styles.swatch, { backgroundColor: p.color, borderRadius: radius.sm }]}>
                <AppText style={styles.swatchText}>{p.name.slice(0, 1).toUpperCase()}</AppText>
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyBold">{p.name}</AppText>
                <AppText variant="caption" tone="muted">
                  {p.rotation.presetId === 'custom' ? 'Custom pattern' : presetInfo(p.rotation.presetId).name}
                </AppText>
              </View>
              <PlatoonBadge platoon={p.platoon} size={30} />
            </View>
            <Row title={active ? 'Showing' : 'Show this rotation'} onPress={active ? undefined : () => setActive(p.id)} chevron={false} testID={`profile-show-${p.id}`} />
            {!active ? <Row title="Overlay on my calendar" toggle={{ value: overlayIds.includes(p.id), onValueChange: () => toggleOverlay(p.id) }} testID={`profile-overlay-${p.id}`} /> : null}
            <Row title="Edit rotation" onPress={() => router.push({ pathname: '/rotation', params: { profileId: p.id } })} testID={`profile-edit-${p.id}`} />
            <Row
              title="Rename or recolor"
              onPress={() => {
                setEditing(p);
                setName(p.name);
              }}
              last
              testID={`profile-rename-${p.id}`}
            />
          </Card>
        );
      })}
      <Button
        label="Add a rotation"
        fullWidth
        style={{ marginTop: spacing.lg }}
        onPress={() => {
          if (requirePro('profiles')) router.push({ pathname: '/rotation', params: { mode: 'new' } });
        }}
        testID="profiles-add"
      />

      {editing ? (
        <Card style={{ marginTop: spacing.lg }} testID="profile-editor">
          <TextField label="Name" value={name} onChangeText={setName} maxLength={30} testID="profile-name" />
          <View style={styles.colors}>
            {PROFILE_COLORS.map((c) => (
              <Button
                key={c}
                label={c === editing.color ? 'Chosen' : ' '}
                size="sm"
                variant="secondary"
                onPress={() => setEditing({ ...editing, color: c })}
                style={{ backgroundColor: c, borderColor: c === editing.color ? colors.text : c, minWidth: 64 }}
              />
            ))}
          </View>
          <Button
            label="Save"
            fullWidth
            onPress={() => {
              updateProfile(editing.id, { name: name.trim() || editing.name, color: editing.color });
              setEditing(null);
            }}
            style={{ marginTop: spacing.md }}
            testID="profile-save"
          />
          {profiles.length > 1 ? <Button label="Delete this rotation" variant="danger" fullWidth onPress={() => setConfirm(true)} style={{ marginTop: spacing.sm }} testID="profile-delete" /> : null}
        </Card>
      ) : null}
      <ConfirmSheet
        visible={confirm}
        title="Delete this rotation?"
        message="Its trades, overtime and leave are deleted too."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (editing) removeProfile(editing.id);
          setConfirm(false);
          setEditing(null);
        }}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  swatchText: { color: '#FFFFFF', fontWeight: '900' },
  flex: { flex: 1 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
