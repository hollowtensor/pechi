import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useASRRecorder } from '../../hooks/useASRRecorder';
import { spacing, borderRadius } from '../../constants/theme';

interface Props {
  remarks: string | null;
  isAdvisor: boolean;
  onSave: (text: string) => void;
}

export function AdvisorRemarks({ remarks, isAdvisor, onSave }: Props) {
  const { colors } = useTheme();
  const { recording, connecting, transcribedText, setTranscribedText, startRecording, stopRecording } =
    useASRRecorder('en');

  const [editText, setEditText] = useState(remarks || '');
  const [dirty, setDirty] = useState(false);

  // Append transcribed text to edit field
  useEffect(() => {
    if (transcribedText) {
      setEditText((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
      setDirty(true);
      setTranscribedText('');
    }
  }, [transcribedText, setTranscribedText]);

  const handleToggleRecording = useCallback(async () => {
    if (recording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  const handleSave = useCallback(() => {
    onSave(editText.trim());
    setDirty(false);
  }, [editText, onSave]);

  // Customer view: show remarks read-only, hide if empty
  if (!isAdvisor) {
    if (!remarks) return null;
    return (
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Advisor Remarks</Text>
        <Text style={[styles.remarksText, { color: colors.textSecondary }]}>{remarks}</Text>
      </View>
    );
  }

  // Advisor view
  return (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Advisor Remarks</Text>

      {/* Recording controls */}
      <TouchableOpacity
        style={[
          styles.recordBar,
          {
            backgroundColor: recording ? colors.accentSurface : 'transparent',
            borderColor: recording ? colors.accentBorder : colors.surfaceBorder,
          },
        ]}
        onPress={handleToggleRecording}
        activeOpacity={0.7}
        disabled={connecting}
      >
        {connecting ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons
            name={recording ? 'stop-circle' : 'mic'}
            size={22}
            color={recording ? colors.accent : colors.textMuted}
          />
        )}
        <Text
          style={[
            styles.recordLabel,
            { color: recording ? colors.accent : colors.textMuted },
          ]}
        >
          {connecting
            ? 'Connecting...'
            : recording
              ? 'Recording... tap to stop'
              : 'Tap to dictate remarks'}
        </Text>
        {recording && (
          <View style={[styles.recordingDot, { backgroundColor: colors.accent }]} />
        )}
      </TouchableOpacity>

      {/* Editable text input */}
      <TextInput
        style={[
          styles.textInput,
          {
            color: colors.text,
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.surfaceBorder,
          },
        ]}
        value={editText}
        onChangeText={(t) => {
          setEditText(t);
          setDirty(true);
        }}
        placeholder="Final remarks will appear here..."
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
      />

      {/* Save button */}
      {dirty && editText.trim().length > 0 && (
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.accent }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.saveBtnText}>Save Remarks</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  remarksText: {
    fontSize: 14,
    lineHeight: 22,
  },
  recordBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  recordLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textInput: {
    fontSize: 14,
    lineHeight: 22,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: 100,
    marginBottom: spacing.md,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
