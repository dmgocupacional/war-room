// ═══ BLOCO: SETUP SCREEN ═══
// First-run onboarding: email + sheets URL.
// Validates email against USUARIOS in Sheets.
// Falls back to admin list if offline.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/store/appStore';
import * as SheetsService from '@/services/sheets';
import * as NotifService from '@/services/notifications';
import { Colors, Radius, Spacing, FontSize } from '@/constants/theme';

const ADMIN_EMAILS = ['henrique.paludo@dimeg.com.br', 'truck@dimeg.com.br'];

export default function SetupScreen() {
  const router = useRouter();
  const { setupUser } = useAppStore();

  const [email, setEmail] = useState('');
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinuar = async () => {
    const trimEmail = email.trim().toLowerCase();
    const trimUrl = sheetsUrl.trim();

    if (!trimEmail.includes('@')) {
      setError('Email inválido');
      return;
    }

    setError(null);
    setLoading(true);

    let nome = trimEmail.split('@')[0] ?? trimEmail;
    let role: 'admin' | 'user' = ADMIN_EMAILS.includes(trimEmail) ? 'admin' : 'user';

    // Try to validate against Sheets USUARIOS
    if (trimUrl) {
      try {
        const data = await SheetsService.loadAll(trimUrl);
        if (data.ok && data.usuarios.length > 0) {
          const user = data.usuarios.find(
            (u) => u.email.toLowerCase() === trimEmail
          );
          if (user) {
            nome = user.nome || nome;
            role = user.role;
          } else if (!ADMIN_EMAILS.includes(trimEmail)) {
            setError('Email não encontrado na lista de usuários do War Room.');
            setLoading(false);
            return;
          }
        }
      } catch {
        // Network error — proceed with offline mode
      }
    }

    setupUser({ email: trimEmail, nome, role, sheetsUrl: trimUrl });

    // Request notification permissions
    await NotifService.requestPermissions();

    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo */}
      <View style={styles.logo}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>WR</Text>
        </View>
        <Text style={styles.title}>War Room</Text>
        <Text style={styles.subtitle}>Execução em tempo real</Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Seu email</Text>
        <TextInput
          style={styles.input}
          placeholder="henrique.paludo@dimeg.com.br"
          placeholderTextColor={Colors.text4}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
        />

        <Text style={styles.label}>URL do Apps Script</Text>
        <TextInput
          style={styles.input}
          placeholder="https://script.google.com/macros/s/..."
          placeholderTextColor={Colors.text4}
          value={sheetsUrl}
          onChangeText={setSheetsUrl}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
        <Text style={styles.hint}>
          Cole a URL do Web App configurado no Google Apps Script do War Room.
          {'\n'}Deixe em branco para modo offline (sem sincronização).
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleContinuar}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Entrar →</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing['3xl'],
  },
  logo: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    color: '#fff',
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text3,
    fontFamily: 'JetBrains Mono',
  },
  form: {
    gap: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text3,
    marginBottom: -4,
  },
  input: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border2,
    color: Colors.text,
    fontSize: FontSize.base,
    padding: Spacing.md,
    height: 52,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.text4,
    lineHeight: 18,
  },
  error: {
    fontSize: FontSize.sm,
    color: Colors.red,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
    height: 52,
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
});
// ── FIM BLOCO ──
