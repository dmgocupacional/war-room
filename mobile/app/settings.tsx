// ═══ BLOCO: SETTINGS SCREEN ═══
import React from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/store/notificationStore';
import { useAppStore } from '@/store/appStore';
import { useStreakStore } from '@/store/streakStore';
import * as NotifService from '@/services/notifications';
import { Colors, Radius, Spacing, FontSize } from '@/constants/theme';

function SettingRow({
  label,
  desc,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  desc?: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, disabled && styles.disabled]}>{label}</Text>
        {desc && <Text style={styles.rowDesc}>{desc}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        thumbColor={Colors.text}
        trackColor={{ false: Colors.bg5, true: Colors.accent }}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const notif = useNotificationStore();
  const { userEmail, userName, userRole, sheetsUrl, logout } = useAppStore();
  const { currentStreak, totalMinutos, totalDias } = useStreakStore();

  const handleMasterToggle = async () => {
    notif.setEnabled(!notif.enabled);
    if (notif.enabled) {
      await NotifService.cancelAll();
    } else {
      const granted = await NotifService.requestPermissions();
      if (granted) await NotifService.rescheduleAll();
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Isso vai apagar suas configurações locais. Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/setup');
        },
      },
    ]);
  };

  const h = Math.floor(totalMinutos / 60);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conta</Text>
        <View style={styles.card}>
          <Text style={styles.accountName}>{userName}</Text>
          <Text style={styles.accountEmail}>{userEmail}</Text>
          <View style={[styles.rolePill, userRole === 'admin' && styles.rolePillAdmin]}>
            <Text style={styles.roleText}>
              {userRole === 'admin' ? '👑 Admin' : '👤 Usuário'}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sua atividade</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{currentStreak}</Text>
            <Text style={styles.statLabel}>dias seguidos</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{totalDias}</Text>
            <Text style={styles.statLabel}>dias ativos</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{h}h</Text>
            <Text style={styles.statLabel}>total registrado</Text>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificações</Text>
        <View style={styles.card}>
          <SettingRow
            label="Notificações ativas"
            desc={notif.permissionGranted ? 'Permissão concedida' : 'Permissão não concedida — toque para ativar'}
            value={notif.enabled}
            onToggle={handleMasterToggle}
          />
        </View>

        <View style={[styles.card, !notif.enabled && styles.cardDisabled]}>
          <SettingRow
            label="🎯 Alerta de foco"
            desc={`Aviso após ${notif.focusHoras}h sem registrar atividade`}
            value={notif.focusEnabled}
            onToggle={() => {
              notif.toggleFocus();
              void NotifService.rescheduleAll();
            }}
            disabled={!notif.enabled}
          />
          <View style={styles.separator} />
          <SettingRow
            label="🌅 Briefing diário"
            desc={`Às ${String(notif.briefingHora).padStart(2, '0')}:00 — suas prioridades do dia`}
            value={notif.briefingEnabled}
            onToggle={() => {
              notif.toggleBriefing();
              void NotifService.rescheduleAll();
            }}
            disabled={!notif.enabled}
          />
          <View style={styles.separator} />
          <SettingRow
            label="📊 Resumo semanal"
            desc={`Sextas às ${String(notif.resumoHora).padStart(2, '0')}:00`}
            value={notif.resumoSemanalEnabled}
            onToggle={() => {
              notif.toggleResumoSemanal();
              void NotifService.rescheduleAll();
            }}
            disabled={!notif.enabled}
          />
        </View>
      </View>

      {/* Sync info */}
      {sheetsUrl ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sheets</Text>
          <View style={styles.card}>
            <Text style={styles.hintText} numberOfLines={2}>
              {sheetsUrl}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: -Spacing.sm },
  backBtn: { paddingVertical: Spacing.xs },
  backText: { fontSize: FontSize.base, color: Colors.accent },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text3, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: Colors.bg3, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cardDisabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
  rowDesc: { fontSize: FontSize.xs, color: Colors.text3 },
  disabled: { color: Colors.text4 },
  separator: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  accountName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, padding: Spacing.md, paddingBottom: 4 },
  accountEmail: { fontSize: FontSize.sm, color: Colors.text3, paddingHorizontal: Spacing.md, fontFamily: 'JetBrains Mono' },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bg5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    margin: Spacing.md,
  },
  rolePillAdmin: { backgroundColor: Colors.amberDim },
  roleText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.text3 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bg3,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.accent, fontFamily: 'JetBrains Mono' },
  statLabel: { fontSize: FontSize.xs, color: Colors.text3, textAlign: 'center' },
  hintText: { fontSize: FontSize.xs, color: Colors.text4, padding: Spacing.md, fontFamily: 'JetBrains Mono' },
  logoutBtn: {
    backgroundColor: Colors.redDim,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.red + '44',
  },
  logoutText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.red },
});
// ── FIM BLOCO ──
