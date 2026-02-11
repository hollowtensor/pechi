import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageToggle } from '../components/LanguageToggle';
import { ClearButton } from '../components/ClearButton';
import { ChatList } from '../components/ChatList';
import { InputDock } from '../components/InputDock';
import { PanelBottomSheet } from '../components/PanelBottomSheet';
import { JobCardModal } from '../components/JobCardModal';
import { GreetingOverlay } from '../components/GreetingOverlay';
import { useAppState } from '../hooks/useAppState';
import { useLiveKit } from '../hooks/useLiveKit';
import type { SidePanelItem, JobCard } from '../types';
import { spacing } from '../constants/theme';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const state = useAppState();
  const { connect, disconnect, publishJobCard, publishTextMessage } = useLiveKit({
    language: state.language,
    setConnected: state.setConnected,
    setConnecting: state.setConnecting,
    setStatus: state.setStatus,
    setAppState: state.setAppState,
    handleDataMessage: state.handleDataMessage,
    resultTimerRef: state.resultTimerRef,
  });

  // Greeting overlay
  const [showGreeting, setShowGreeting] = useState(true);

  // Job card modal state
  const [jobCardModalVisible, setJobCardModalVisible] = useState(false);
  const [activeJobCardPanel, setActiveJobCardPanel] = useState<SidePanelItem | null>(null);

  const handleOpenJobCard = useCallback((panel: SidePanelItem) => {
    setActiveJobCardPanel(panel);
    setJobCardModalVisible(true);
  }, []);

  const handleConfirmJobCard = useCallback(
    (jobCard: JobCard) => {
      publishJobCard(jobCard);
      setJobCardModalVisible(false);
      setActiveJobCardPanel(null);
    },
    [publishJobCard],
  );

  const handleCancelJobCard = useCallback(() => {
    if (activeJobCardPanel) {
      state.handleCancelJobCard(activeJobCardPanel.id);
    }
    setJobCardModalVisible(false);
    setActiveJobCardPanel(null);
  }, [activeJobCardPanel, state]);

  const handleUpdateJobCard = useCallback(
    (jobCard: JobCard) => {
      if (activeJobCardPanel) {
        state.handleUpdateJobCard(activeJobCardPanel.id, jobCard);
        setActiveJobCardPanel((prev) =>
          prev
            ? { ...prev, content: { type: 'job_card' as const, data: jobCard } }
            : null,
        );
      }
    },
    [activeJobCardPanel, state],
  );

  const handleMicPress = useCallback(() => {
    if (state.connected) {
      disconnect();
    } else {
      connect();
    }
  }, [state.connected, connect, disconnect]);

  const handleSendText = useCallback(
    (text: string) => {
      state.addUserMessage(text);
      publishTextMessage(text);
    },
    [state.addUserMessage, publishTextMessage],
  );

  const activeJobCard =
    activeJobCardPanel?.content.type === 'job_card'
      ? activeJobCardPanel.content.data
      : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AnimatedBackground state={state.appState} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={[styles.title, { color: colors.text }]}>Pechi</Text>
        <View style={styles.headerActions}>
          <ThemeToggle />
          <LanguageToggle
            language={state.language}
            onSelect={state.setLanguage}
            disabled={state.connected}
          />
          <ClearButton onClear={state.handleClear} disabled={state.messages.length === 0} />
        </View>
      </View>

      {/* Chat */}
      <ChatList
        messages={state.messages}
        appState={state.appState}
        connected={state.connected}
      />

      {/* Input Dock */}
      <InputDock
        connected={state.connected}
        connecting={state.connecting}
        status={state.status}
        appState={state.appState}
        onMicPress={handleMicPress}
        onSendText={handleSendText}
      />

      {/* Side panels as bottom sheet */}
      <PanelBottomSheet
        panels={state.sidePanels}
        onToggleExpand={state.handleToggleExpand}
        onDismiss={state.handleDismissPanel}
        onOpenJobCard={handleOpenJobCard}
      />

      {/* Greeting video overlay */}
      {showGreeting && <GreetingOverlay onDone={() => setShowGreeting(false)} />}

      {/* Job card full-screen modal */}
      {activeJobCard && (
        <JobCardModal
          visible={jobCardModalVisible}
          jobCard={activeJobCard}
          onConfirm={handleConfirmJobCard}
          onCancel={handleCancelJobCard}
          onUpdate={handleUpdateJobCard}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
