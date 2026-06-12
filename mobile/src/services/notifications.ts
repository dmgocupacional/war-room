// ═══ BLOCO: NOTIFICATIONS SERVICE ═══
// Local notifications only — no backend required.
// Focus alert: scheduled X hours after last activity stop.
// Daily briefing: every day at configurable hour.
// Weekly summary: every Friday at configurable hour.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotificationStore } from '../store/notificationStore';

// IDs to cancel/replace specific notification slots
const IDS = {
  FOCUS:    'wr-focus-alert',
  BRIEFING: 'wr-daily-briefing',
  RESUMO:   'wr-weekly-resumo',
} as const;

// ── Request permission ──
export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    useNotificationStore.getState().setPermissionGranted(true);
    return true;
  }
  const { status } = await Notifications.requestPermissionsAsync();
  const granted = status === 'granted';
  useNotificationStore.getState().setPermissionGranted(granted);
  return granted;
}

// ── Configure handler (call once in root layout) ──
export function configureHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// ── Focus alert: schedule X hours from now ──
// Call when user stops/pauses timer.
// Cancel when user starts a new timer.
export async function scheduleFocusAlert(): Promise<void> {
  const { enabled, focusEnabled, focusHoras, permissionGranted } =
    useNotificationStore.getState();
  if (!enabled || !focusEnabled || !permissionGranted) return;

  await Notifications.cancelScheduledNotificationAsync(IDS.FOCUS).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.FOCUS,
    content: {
      title: '⏱️ War Room',
      body: `Você está há ${focusHoras}h sem registrar atividade. Retome o foco!`,
      data: { type: 'focus' },
    },
    trigger: {
      seconds: focusHoras * 3600,
      repeats: false,
    } as Notifications.TimeIntervalTriggerInput,
  });
}

export async function cancelFocusAlert(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(IDS.FOCUS).catch(() => {});
}

// ── Daily briefing ──
export async function scheduleDailyBriefing(projetos: string[]): Promise<void> {
  const { enabled, briefingEnabled, briefingHora, permissionGranted } =
    useNotificationStore.getState();
  if (!enabled || !briefingEnabled || !permissionGranted) return;

  const preview = projetos.slice(0, 3).join(', ');
  await Notifications.cancelScheduledNotificationAsync(IDS.BRIEFING).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.BRIEFING,
    content: {
      title: '🌅 Bom dia — War Room',
      body: preview
        ? `Prioridades de hoje: ${preview}`
        : 'Abra o app para ver suas prioridades de hoje.',
      data: { type: 'briefing' },
    },
    trigger: {
      hour: briefingHora,
      minute: 0,
      repeats: true,
    } as Notifications.DailyTriggerInput,
  });
}

// ── Weekly summary (Friday) ──
export async function scheduleWeeklySummary(): Promise<void> {
  const { enabled, resumoSemanalEnabled, resumoHora, permissionGranted } =
    useNotificationStore.getState();
  if (!enabled || !resumoSemanalEnabled || !permissionGranted) return;

  await Notifications.cancelScheduledNotificationAsync(IDS.RESUMO).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: IDS.RESUMO,
    content: {
      title: '📊 Resumo da Semana — War Room',
      body: 'Veja quanto você avançou esta semana.',
      data: { type: 'resumo_semanal' },
    },
    trigger: {
      weekday: 6, // Friday (1=Sunday, 6=Friday in Expo)
      hour: resumoHora,
      minute: 0,
      repeats: true,
    } as Notifications.WeeklyTriggerInput,
  });
}

// ── Cancel all ──
export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Re-schedule all based on current prefs ──
export async function rescheduleAll(proximosProjetos: string[] = []): Promise<void> {
  const { enabled } = useNotificationStore.getState();
  if (!enabled) {
    await cancelAll();
    return;
  }
  await scheduleDailyBriefing(proximosProjetos);
  await scheduleWeeklySummary();
  // Focus alert is scheduled on-demand (after timer stop), not here
}
// ── FIM BLOCO ──
