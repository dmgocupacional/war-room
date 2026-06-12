// ═══ BLOCO: NOTA MODAL COMPONENT ═══
// Appears when user stops timer.
// Two fields: free text note + mood emoji.
// "Pular" skips → stops with empty note.

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Radius, Spacing, FontSize } from '../constants/theme';

const EMOJIS = ['💪', '✅', '🤔', '😓', '🔥', '⚡', '🎯', '😴'];

interface NotaModalProps {
  visible: boolean;
  etapaNome: string;
  projNome: string;
  duracaoMin: number;
  onConfirm: (nota: string) => void;
  onSkip: () => void;
}

export function NotaModal({
  visible,
  etapaNome,
  projNome,
  duracaoMin,
  onConfirm,
  onSkip,
}: NotaModalProps) {
  const [nota, setNota] = useState('');
  const [emoji, setEmoji] = useState('');

  const handleConfirm = () => {
    const full = [emoji, nota.trim()].filter(Boolean).join(' ');
    setNota('');
    setEmoji('');
    onConfirm(full);
  };

  const handleSkip = () => {
    setNota('');
    setEmoji('');
    onSkip();
  };

  const h = Math.floor(duracaoMin / 60);
  const m = duracaoMin % 60;
  const duracaoStr = h > 0 ? `${h}h ${m}min` : `${m}min`;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.handle} />
          <Text style={styles.title}>Sessão encerrada</Text>
          <Text style={styles.subtitle}>
            {projNome}  ›  {etapaNome}
          </Text>
          <Text style={styles.duracao}>{duracaoStr} de trabalho</Text>

          {/* Emoji mood */}
          <Text style={styles.label}>Como foi?</Text>
          <View style={styles.emojiRow}>
            {EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                onPress={() => setEmoji(e === emoji ? '' : e)}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note input */}
          <Text style={styles.label}>O que você fez? (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Finalizei o módulo de autenticação..."
            placeholderTextColor={Colors.text4}
            multiline
            numberOfLines={3}
            value={nota}
            onChangeText={setNota}
            returnKeyType="done"
            blurOnSubmit
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
              <Text style={styles.skipText}>Pular</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bg2,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.bg5,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.text3,
    textAlign: 'center',
    fontFamily: 'JetBrains Mono',
  },
  duracao: {
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.accent,
    textAlign: 'center',
    fontFamily: 'JetBrains Mono',
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.text3,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnActive: {
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  emojiText: {
    fontSize: 22,
  },
  input: {
    backgroundColor: Colors.bg3,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border2,
    color: Colors.text,
    fontSize: FontSize.base,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.bg4,
    alignItems: 'center',
  },
  skipText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.text3,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
});
// ── FIM BLOCO ──
