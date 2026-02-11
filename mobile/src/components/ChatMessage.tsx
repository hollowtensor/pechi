import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../contexts/ThemeContext';
import type { ChatMessage as ChatMessageType } from '../types';
import { spacing, borderRadius } from '../constants/theme';

interface Props {
  message: ChatMessageType;
}

export const ChatMessage = React.memo(function ChatMessage({ message }: Props) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const isUser = message.role === 'user';

  const mdStyles = useMemo(
    () => ({
      body: { color: colors.text, fontSize: 15, lineHeight: 22 },
      paragraph: { marginTop: 0, marginBottom: 4 },
      strong: { fontWeight: '700' as const, color: colors.text },
      em: { fontStyle: 'italic' as const },
      link: { color: colors.accentLight },
      bullet_list: { marginTop: 4, marginBottom: 4 },
      ordered_list: { marginTop: 4, marginBottom: 4 },
      list_item: { marginBottom: 2 },
      code_inline: {
        backgroundColor: colors.surfaceElevated,
        color: colors.accentLight,
        fontFamily: 'Courier',
        fontSize: 13,
        paddingHorizontal: 4,
        borderRadius: 3,
      },
      fence: {
        backgroundColor: colors.surface,
        borderColor: colors.surfaceBorder,
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginVertical: 4,
      },
      code_block: { color: colors.text, fontFamily: 'Courier', fontSize: 13 },
    }),
    [colors],
  );

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.containerUser : styles.containerAgent,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? [
                styles.bubbleUser,
                {
                  backgroundColor: colors.userBubble,
                  borderColor: colors.userBubbleBorder,
                },
              ]
            : [
                styles.bubbleAgent,
                {
                  backgroundColor: colors.agentBubble,
                  borderColor: colors.agentBubbleBorder,
                },
              ],
        ]}
      >
        {isUser ? (
          <Text style={[styles.userText, { color: colors.text }]}>{message.text}</Text>
        ) : (
          <Markdown style={mdStyles}>{message.text}</Markdown>
        )}
        <Text style={[styles.time, { color: colors.textMuted }]}>{message.time}</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  containerUser: {
    alignItems: 'flex-end',
  },
  containerAgent: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    borderBottomLeftRadius: 4,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
  },
  time: {
    fontSize: 10,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
});
