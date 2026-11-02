import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { RotationSetup } from '@/components/RotationSetup';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { FREE_PROFILE_LIMIT } from '@/lib/model';
import { localISO } from '@/lib/rotation';
import { defaultSetup, rotationFromSetup, setupFromRotation } from '@/lib/setup';
import { successHaptic } from '@/services/haptics';
import { selectActiveProfile, useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

/** Edit a rotation (?profileId=...) or add a new one (?mode=new, Pro). */
export default function RotationScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ profileId?: string; mode?: string }>();
  const isNew = params.mode === 'new';
  const profile = useStore((s) => s.profiles.find((p) => p.id === params.profileId) ?? selectActiveProfile(s));
  const profileCount = useStore((s) => s.profiles.length);
  const isPro = useStore((s) => s.meta.isPro);
  const hour12 = useStore((s) => s.settings.hour12);
  const setRotation = useStore((s) => s.setRotation);
  const addProfile = useStore((s) => s.addProfile);
  const [setup, setSetup] = useState(() => (isNew ? defaultSetup(localISO()) : setupFromRotation(profile.rotation, profile.platoon, localISO())));
  const [name, setName] = useState('');

  const blocked = isNew && !isPro && profileCount >= FREE_PROFILE_LIMIT;

  const save = () => {
    const { rotation, platoon } = rotationFromSetup(setup);
    if (isNew) {
      if (blocked) return;
      addProfile(name || 'Second rotation', rotation, platoon);
    } else {
      setRotation(profile.id, rotation, platoon);
    }
    successHaptic();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen
      scroll
      testID="rotation-screen"
      footer={
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Button label={isNew ? 'Add rotation' : 'Save'} size="lg" fullWidth onPress={save} disabled={blocked} testID="rotation-save" />
        </View>
      }
    >
      <Header title={isNew ? 'New rotation' : profile.name === 'Me' ? 'My rotation' : profile.name} dismiss="back" />
      {isNew ? <TextField label="Name" placeholder="Second job, partner..." value={name} onChangeText={setName} maxLength={30} testID="rotation-name" /> : null}
      <RotationSetup value={setup} onChange={setSetup} hour12={hour12} />
    </Screen>
  );
}
