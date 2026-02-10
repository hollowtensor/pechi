import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import type { ChatMessage as ChatMessageType } from '../types';
import { colors, spacing, borderRadius } from '../constants/theme';

interface Props {
  message: ChatMessageType;
}

export const ChatMessage = React.memo(function ChatMessage({ message }: Props) {
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
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAgent]}>
        {isUser ? (
          <Text style={styles.userText}>{message.text}</Text>
        ) : (
          <Markdown style={markdownStyles}>{message.text}</Markdown>
        )}
        <Text style={styles.time}>{message.time}</Text>
      </View>
    </Animated.View>
  );
});

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 4,
  },
  strong: {
    fontWeight: '700',
    color: colors.text,
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: colors.accentLight,
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 4,
  },
  list_item: {
    marginBottom: 2,
  },
  code_inline: {
    backgroundColor: 'rgba(240, 235, 227, 0.08)',
    color: colors.accentLight,
    fontFamily: 'Courier',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  fence: {
    backgroundColor: 'rgba(240, 235, 227, 0.05)',
    borderColor: 'rgba(240, 235, 227, 0.08)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  code_block: {
    color: colors.text,
    fontFamily: 'Courier',
    fontSize: 13,
  },
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
  },
  bubbleUser: {
    backgroundColor: colors.userBubble,
    borderWidth: 1,
    borderColor: colors.userBubbleBorder,
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: colors.agentBubble,
    borderWidth: 1,
    borderColor: colors.agentBubbleBorder,
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  time: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
});
