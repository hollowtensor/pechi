import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { StatusIndicator } from './StatusIndicator';
import { MicButton } from './MicButton';
import type { AppState } from '../types';
import { spacing, borderRadius } from '../constants/theme';

interface Props {
  connected: boolean;
  connecting: boolean;
  status: string;
  appState: AppState;
  onMicPress: () => void;
  onSendText: (text: string) => void;
}

export function InputDock({
  connected,
  connecting,
  status,
  appState,
  onMicPress,
  onSendText,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || !connected) return;
    onSendText(trimmed);
    setText('');
  };

  const canSend = text.trim().length > 0 && connected;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, spacing.lg),
          borderTopColor: colors.surfaceBorder,
          backgroundColor: colors.background,
        },
      ]}
    >
      <StatusIndicator connected={connected} status={status} />

      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.textInput,
            {
              color: colors.text,
              borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={connected}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor: canSend ? colors.accent : colors.surface,
              borderColor: canSend ? colors.accentBorder : colors.surfaceBorder,
            },
          ]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.sendIcon,
              { color: canSend ? '#fff' : colors.textMuted },
            ]}
          >
            {'\u2191'}
          </Text>
        </TouchableOpacity>
      </View>

      <MicButton
        connected={connected}
        connecting={connecting}
        appState={appState}
        onPress={onMicPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
});
