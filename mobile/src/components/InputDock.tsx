import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { StatusIndicator } from './StatusIndicator';
import { MicButton } from './MicButton';
import type { AppState } from '../types';
import { spacing, borderRadius } from '../constants/theme';

interface Props {
  connected: boolean;
  connecting: boolean;
  micActive: boolean;
  status: string;
  appState: AppState;
  onMicPress: () => void;
  onSendText: (text: string) => void;
  onAttachImage?: () => void;
  replyToImage?: { uri: string } | null;
  onCancelReply?: () => void;
}

export function InputDock({
  connected,
  connecting,
  micActive,
  status,
  appState,
  onMicPress,
  onSendText,
  onAttachImage,
  replyToImage,
  onCancelReply,
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

      {/* Reply indicator */}
      {replyToImage && (
        <View style={[styles.replyBar, { backgroundColor: colors.surface, borderColor: colors.accentBorder }]}>
          <View style={[styles.replyAccent, { backgroundColor: colors.accent }]} />
          <Image source={{ uri: replyToImage.uri }} style={styles.replyThumb} />
          <View style={styles.replyTextContainer}>
            <Text style={[styles.replyLabel, { color: colors.accent }]}>Replying to image</Text>
            <Text style={[styles.replyHint, { color: colors.textMuted }]}>
              {micActive ? 'Speak or type your feedback' : 'Type your feedback'}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={12}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[
            styles.attachBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
          onPress={onAttachImage}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={[
            styles.textInput,
            {
              color: colors.text,
              borderColor: colors.surfaceBorder,
              backgroundColor: colors.surface,
            },
          ]}
          placeholder={replyToImage ? 'Describe the issue...' : 'Type a message...'}
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
        micActive={micActive}
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
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  replyAccent: {
    width: 3,
    alignSelf: 'stretch',
  },
  replyThumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginLeft: spacing.sm,
    marginVertical: spacing.xs,
  },
  replyTextContainer: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyHint: {
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
