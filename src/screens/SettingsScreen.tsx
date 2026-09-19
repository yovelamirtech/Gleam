import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import appConfig from '../../app.json';
import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import Toggle from '../components/Toggle';
import { DEV_TOOLS_ENABLED } from '../constants/devTools';
import { usePurchases } from '../hooks/usePurchases';
import { useSettings } from '../hooks/useSettings';
import type { RootStackParamList } from '../navigation/types';
import { resetProgress } from '../storage/progress';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { settings, updateSettings } = useSettings();
  const { adsRemoved, removeAdsPrice, buyRemoveAds, restore } = usePurchases();
  const insets = useSafeAreaInsets();

  function handleResetProgress() {
    Alert.alert(
      'Reset progress',
      'This deletes every level and board you have unlocked or completed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetProgress() },
      ]
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="Sound">
          <SettingsRow
            label="Sound effects"
            right={
              <Toggle
                value={settings.soundEnabled}
                onValueChange={(value) => updateSettings({ soundEnabled: value })}
              />
            }
          />
          <SettingsRow
            label="Music"
            right={
              <Toggle
                value={settings.musicEnabled}
                onValueChange={(value) => updateSettings({ musicEnabled: value })}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Ads">
          {adsRemoved ? (
            <SettingsRow label="Ads removed" right={<Text style={styles.value}>✓</Text>} />
          ) : (
            <SettingsRow
              label="Remove ads"
              onPress={buyRemoveAds}
              right={<Text style={styles.value}>{removeAdsPrice ?? '…'}</Text>}
            />
          )}
          {!adsRemoved && <SettingsRow label="Restore purchases" onPress={restore} />}
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow label={appConfig.expo.name} right={<Text style={styles.value}>v{appConfig.expo.version}</Text>} />
        </SettingsSection>

        {DEV_TOOLS_ENABLED ? (
          <SettingsSection title="Developer">
            <SettingsRow label="Dev tools" onPress={() => navigation.navigate('DevTools')} />
          </SettingsSection>
        ) : null}

        <Pressable style={styles.dangerButton} onPress={handleResetProgress}>
          <Text style={styles.dangerButtonText}>Reset progress</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  back: { fontSize: 16, color: colors.textMuted },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  value: { fontSize: 14, color: colors.textMuted },
  dangerButton: {
    marginTop: 32,
    backgroundColor: colors.danger,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
});
