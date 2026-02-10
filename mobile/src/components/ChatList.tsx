import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ChatMessage } from './ChatMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import type { ChatMessage as ChatMessageType, AppState } from '../types';
import { colors, spacing } from '../constants/theme';

interface Props {
  messages: ChatMessageType[];
  appState: AppState;
  connected: boolean;
}

export function ChatList({ messages, appState, connected }: Props) {
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, appState]);

  const renderItem = ({ item }: { item: ChatMessageType }) => (
    <ChatMessage message={item} />
  );

  const ListFooter = appState === 'thinking' ? <ThinkingIndicator /> : null;

  if (messages.length === 0 && appState !== 'thinking') {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.placeholder}>
          {connected
            ? 'Ask about your vehicle, service history, or parts...'
            : 'Press Start and speak to begin...'}
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
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
