import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GlassCard } from '../components/GlassCard';
import { ControlBar } from '../components/ControlBar';
import { StatusIndicator } from '../components/StatusIndicator';
import { ChatList } from '../components/ChatList';
import { PanelBottomSheet } from '../components/PanelBottomSheet';
import { JobCardModal } from '../components/JobCardModal';
import { useAppState } from '../hooks/useAppState';
import { useLiveKit } from '../hooks/useLiveKit';
import type { SidePanelItem, JobCard } from '../types';
import { colors, spacing } from '../constants/theme';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const state = useAppState();
  const { connect, disconnect, publishJobCard } = useLiveKit({
    language: state.language,
    setConnected: state.setConnected,
    setConnecting: state.setConnecting,
    setStatus: state.setStatus,
    setAppState: state.setAppState,
    handleDataMessage: state.handleDataMessage,
    resultTimerRef: state.resultTimerRef,
  });

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

  const activeJobCard =
    activeJobCardPanel?.content.type === 'job_card'
      ? activeJobCardPanel.content.data
      : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AnimatedBackground state={state.appState} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pechi</Text>
        <Text style={styles.tagline}>Maruti Suzuki Service Assistant</Text>
      </View>

      {/* Main card */}
      <GlassCard style={styles.mainCard}>
        <ControlBar
          connected={state.connected}
          connecting={state.connecting}
          messageCount={state.messages.length}
          language={state.language}
          onStart={connect}
          onStop={disconnect}
          onClear={state.handleClear}
          onLanguageChange={state.setLanguage}
        />
        <StatusIndicator connected={state.connected} status={state.status} />
        <ChatList
          messages={state.messages}
          appState={state.appState}
          connected={state.connected}
        />
      </GlassCard>

      {/* Side panels as bottom sheet */}
      <PanelBottomSheet
        panels={state.sidePanels}
        onToggleExpand={state.handleToggleExpand}
        onDismiss={state.handleDismissPanel}
        onOpenJobCard={handleOpenJobCard}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  mainCard: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
});
