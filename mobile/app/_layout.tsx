// ═══ BLOCO: ROOT LAYOUT ═══
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { useAppStore } from '@/store/appStore';
import { configureHandler } from '@/services/notifications';
import { useSync } from '@/hooks/useSync';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isSetupDone } = useAppStore();
  const router = useRouter();
  const segments = useSegments();
  const { refresh } = useSync();

  // ── Load fonts ──
  useEffect(() => {
    async function init() {
      await Font.loadAsync({
        'JetBrains Mono': require('../assets/fonts/JetBrainsMono-Regular.ttf'),
        'JetBrains Mono Bold': require('../assets/fonts/JetBrainsMono-SemiBold.ttf'),
        'Sora': require('../assets/fonts/Sora-Regular.ttf'),
        'Sora Bold': require('../assets/fonts/Sora-SemiBold.ttf'),
        'Sora ExtraBold': require('../assets/fonts/Sora-ExtraBold.ttf'),
      }).catch(() => {
        // Fonts optional — system fallback used
      });

      configureHandler();
      await SplashScreen.hideAsync();
    }
    void init();
  }, []);

  // ── Auth gate ──
  useEffect(() => {
    const inSetup = segments[0] === 'setup';
    if (!isSetupDone && !inSetup) {
      router.replace('/setup');
    } else if (isSetupDone && inSetup) {
      router.replace('/(tabs)');
    }
  }, [isSetupDone, segments, router]);

  // ── Initial data load ──
  useEffect(() => {
    if (isSetupDone) {
      void refresh();
    }
  }, [isSetupDone]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
// ── FIM BLOCO ──
