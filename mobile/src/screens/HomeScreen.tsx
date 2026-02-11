import React, { useCallback, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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

export function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
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
        <View style={styles.headerSide}>
          <ThemeToggle />
          <LanguageToggle
            language={state.language}
            onSelect={state.setLanguage}
            disabled={state.connected}
          />
        </View>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
        />
        <View style={[styles.headerSide, styles.headerSideEnd]}>
          <ClearButton onClear={state.handleClear} disabled={state.messages.length === 0} />
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeIcon, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat */}
      <ChatList
        messages={state.messages}
        appState={state.appState}
        connected={state.connected}
        onPanelPress={state.openPanelById}
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
        visible={state.showSheet}
        onToggleExpand={state.handleToggleExpand}
        onDismiss={state.handleDismissPanel}
        onOpenJobCard={handleOpenJobCard}
        onClose={() => state.setShowSheet(false)}
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
  headerSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerSideEnd: {
    justifyContent: 'flex-end',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
});
