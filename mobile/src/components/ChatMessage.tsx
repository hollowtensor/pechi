import React, { useEffect, useRef, useMemo } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../contexts/ThemeContext';
import type { ChatMessage as ChatMessageType } from '../types';
import { spacing, borderRadius } from '../constants/theme';

interface Props {
  message: ChatMessageType;
  onPanelPress?: (panelId: string) => void;
  onReply?: (messageId: string) => void;
  isReplyTarget?: boolean;
}

export const ChatMessage = React.memo(function ChatMessage({ message, onPanelPress, onReply, isReplyTarget }: Props) {
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
  const hasImage = !!message.image;
  const canReply = hasImage && message.image!.status === 'done' && !!onReply && !isReplyTarget;

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

  const hasPanelLink = !!message.panelId && !!onPanelPress;

  const renderImageBubble = () => {
    const img = message.image!;
    return (
      <View
        style={[
          styles.imageBubble,
          {
            borderColor: isReplyTarget ? colors.accent : colors.surfaceBorder,
            backgroundColor: colors.surface,
            borderWidth: isReplyTarget ? 2 : 1,
          },
        ]}
      >
        <Image source={{ uri: img.uri }} style={styles.chatImage} resizeMode="cover" />

        {/* Status overlay */}
        {(img.status === 'uploading' || img.status === 'analyzing') && (
          <View style={styles.imageOverlay}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.imageOverlayText}>
              {img.status === 'uploading' ? 'Uploading...' : 'Analyzing...'}
            </Text>
          </View>
        )}

        {img.status === 'error' && (
          <View style={[styles.imageOverlay, { backgroundColor: 'rgba(239,68,68,0.7)' }]}>
            <Ionicons name="alert-circle" size={18} color="#fff" />
            <Text style={styles.imageOverlayText}>Analysis failed</Text>
          </View>
        )}

        {/* Analysis result */}
        {img.status === 'done' && img.analysis && (
          <View style={[styles.analysisSection, { borderTopColor: colors.surfaceBorder }]}>
            {img.tags && img.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {img.tags.map((tag, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: colors.accentSurface }]}>
                    <Text style={[styles.tagText, { color: colors.accent }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.analysisText, { color: colors.textSecondary }]} numberOfLines={4}>
              {img.analysis}
            </Text>
          </View>
        )}

        {/* Reply / selected state footer */}
        <View style={[styles.imageFooter, { borderTopColor: colors.surfaceBorder }]}>
          <Text style={[styles.time, { color: colors.textMuted }]}>{message.time}</Text>
          {canReply && (
            <TouchableOpacity
              style={[styles.replyBtn, { backgroundColor: colors.accentSurface }]}
              onPress={() => onReply!(message.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.accent} />
              <Text style={[styles.replyBtnText, { color: colors.accent }]}>Reply</Text>
            </TouchableOpacity>
          )}
          {isReplyTarget && (
            <View style={[styles.replyBtn, { backgroundColor: colors.accentSurface }]}>
              <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
              <Text style={[styles.replyBtnText, { color: colors.accent }]}>Selected</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTextBubble = () => (
    <View
      style={[
        styles.bubble,
        isUser
          ? [styles.bubbleUser, { backgroundColor: colors.userBubble, borderColor: colors.userBubbleBorder }]
          : [styles.bubbleAgent, { backgroundColor: colors.agentBubble, borderColor: hasPanelLink ? colors.accent : colors.agentBubbleBorder }],
      ]}
    >
      {isUser ? (
        <Text style={[styles.userText, { color: colors.text }]}>{message.text}</Text>
      ) : (
        <Markdown style={mdStyles}>{message.text}</Markdown>
      )}
      {hasPanelLink && (
        <Text style={[styles.panelHint, { color: colors.textMuted }]}>Tap to view details</Text>
      )}
      <Text style={[styles.time, { color: colors.textMuted }]}>{message.time}</Text>
    </View>
  );

  const content = hasImage ? renderImageBubble() : renderTextBubble();
  const wrappedContent = hasPanelLink ? (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onPanelPress(message.panelId!)}>
      {content}
    </TouchableOpacity>
  ) : (
    content
  );

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.containerUser : styles.containerAgent,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {wrappedContent}
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
  panelHint: {
    fontSize: 11,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  // Image bubble
  imageBubble: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chatImage: {
    width: 240,
    height: 180,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: undefined,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  analysisSection: {
    padding: spacing.md,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  analysisText: {
    fontSize: 13,
    lineHeight: 18,
  },
  imageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  replyBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
