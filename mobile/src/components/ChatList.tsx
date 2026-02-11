import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ChatMessage } from './ChatMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import { useTheme } from '../contexts/ThemeContext';
import type { ChatMessage as ChatMessageType, AppState } from '../types';
import { spacing } from '../constants/theme';

interface Props {
  messages: ChatMessageType[];
  appState: AppState;
  connected: boolean;
  onPanelPress?: (panelId: string) => void;
}

export function ChatList({ messages, appState, connected, onPanelPress }: Props) {
  const { colors } = useTheme();
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, appState]);

  const renderItem = ({ item }: { item: ChatMessageType }) => (
    <ChatMessage message={item} onPanelPress={onPanelPress} />
  );

  const ListFooter = appState === 'thinking' ? <ThinkingIndicator /> : null;

  if (messages.length === 0 && appState !== 'thinking') {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.placeholder, { color: colors.textMuted }]}>
          {connected
            ? 'Ask about your vehicle, service history, or parts...'
            : 'Tap the mic and speak to begin...'}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={messages}
      renderItem={renderItem}
      keyExtractor={(_, index) => index.toString()}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      ListFooterComponent={ListFooter}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  placeholder: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
