import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
import { uploadMedia, reanalyzeMedia } from '../services/api';
import type { SidePanelItem, JobCard } from '../types';
import { spacing } from '../constants/theme';

export function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const state = useAppState();
  const { connect, disconnect, toggleMic, publishJobCard, publishTextMessage, publishImageFeedback, clearImageFeedback, publishImageContext } = useLiveKit({
    language: state.language,
    setConnected: state.setConnected,
    setConnecting: state.setConnecting,
    setStatus: state.setStatus,
    setAppState: state.setAppState,
    setMicActive: state.setMicActive,
    handleDataMessage: state.handleDataMessage,
    resultTimerRef: state.resultTimerRef,
  });

  // Auto-connect to LiveKit when screen mounts (no mic yet)
  useEffect(() => {
    connect();
    return () => { disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Greeting overlay
  const [showGreeting, setShowGreeting] = useState(true);

  // Job card modal state
  const [jobCardModalVisible, setJobCardModalVisible] = useState(false);
  const [activeJobCardPanel, setActiveJobCardPanel] = useState<SidePanelItem | null>(null);

  // -----------------------------------------------------------------------
  // Image upload flow
  // -----------------------------------------------------------------------

  const pickAndUploadImage = useCallback(async (source: 'camera' | 'gallery') => {
    // Request permissions
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return;
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const fileName = asset.fileName || 'photo.jpg';
    const mimeType = asset.mimeType || 'image/jpeg';

    // Add image to chat immediately (uploading state)
    const msgId = state.addImageMessage(uri);

    // Upload + first VLM analysis (no feedback)
    state.updateImageMessage(msgId, { status: 'analyzing' });
    try {
      const resp = await uploadMedia(uri, fileName, mimeType);
      if (resp.success) {
        state.updateImageMessage(msgId, {
          status: 'done',
          mediaId: resp.mediaId,
          analysis: resp.analysis,
          tags: resp.tags,
        });
        // Send VLM analysis to bot so LLM agent has image context
        if (resp.mediaId && resp.analysis) {
          publishImageContext(resp.mediaId, resp.analysis, resp.tags || []);
        }
      } else {
        state.updateImageMessage(msgId, { status: 'error' });
      }
    } catch {
      state.updateImageMessage(msgId, { status: 'error' });
    }
  }, [state, publishImageContext]);

  const handleAttachImage = useCallback(() => {
    Alert.alert('Upload Image', 'Choose a source', [
      { text: 'Camera', onPress: () => pickAndUploadImage('camera') },
      { text: 'Gallery', onPress: () => pickAndUploadImage('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickAndUploadImage]);

  // Reply to image → set reply mode + signal bot
  const handleReply = useCallback((messageId: string) => {
    state.setReplyToImageId(messageId);
    // Tell the bot that the next voice message is image feedback
    const imgMsg = state.getImageMessage(messageId);
    const mediaId = imgMsg?.image?.mediaId;
    if (mediaId) {
      publishImageFeedback(mediaId);
    }
  }, [state, publishImageFeedback]);

  const handleCancelReply = useCallback(() => {
    state.setReplyToImageId(null);
    // Tell the bot to exit image feedback mode
    clearImageFeedback();
  }, [state, clearImageFeedback]);

  // Get the image being replied to (for reply bar thumbnail)
  const replyToImageMsg = state.replyToImageId
    ? state.getImageMessage(state.replyToImageId)
    : null;
  const replyToImage = replyToImageMsg?.image
    ? { uri: replyToImageMsg.image.uri }
    : null;

  // -----------------------------------------------------------------------
  // Send text/voice — handles reply-to-image feedback
  // -----------------------------------------------------------------------

  const handleSendText = useCallback(
    async (text: string) => {
      state.addUserMessage(text);

      if (state.replyToImageId) {
        // This is typed feedback for an image — reanalyze via REST API
        const imgMsg = state.getImageMessage(state.replyToImageId);
        const mediaId = imgMsg?.image?.mediaId;
        state.setReplyToImageId(null);
        clearImageFeedback();

        if (mediaId) {
          state.updateImageMessage(imgMsg!.id, { status: 'analyzing' });
          try {
            const resp = await reanalyzeMedia(mediaId, text);
            if (resp.success) {
              state.updateImageMessage(imgMsg!.id, {
                status: 'done',
                analysis: resp.analysis,
                tags: resp.tags,
              });
              // Send enriched context to LLM agent via bot
              const summary = `The customer uploaded an image and said: "${text}"\nImage analysis: ${resp.analysis}`;
              publishTextMessage(summary);
            } else {
              state.updateImageMessage(imgMsg!.id, { status: 'done' });
              publishTextMessage(text);
            }
          } catch {
            state.updateImageMessage(imgMsg!.id, { status: 'done' });
            publishTextMessage(text);
          }
        } else {
          publishTextMessage(text);
        }
      } else {
        publishTextMessage(text);
      }
    },
    [state, publishTextMessage, clearImageFeedback],
  );

  // -----------------------------------------------------------------------
  // Job card handlers
  // -----------------------------------------------------------------------

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
    if (!state.connected) return; // room not ready yet
    toggleMic();
  }, [state.connected, toggleMic]);

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
            disabled={state.micActive}
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
        replyToImageId={state.replyToImageId}
        onPanelPress={state.openPanelById}
        onReply={handleReply}
      />

      {/* Input Dock */}
      <InputDock
        connected={state.connected}
        connecting={state.connecting}
        micActive={state.micActive}
        status={state.status}
        appState={state.appState}
        onMicPress={handleMicPress}
        onSendText={handleSendText}
        onAttachImage={handleAttachImage}
        replyToImage={replyToImage}
        onCancelReply={handleCancelReply}
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
