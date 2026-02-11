import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PanelCard } from './PanelCard';
import { useTheme } from '../contexts/ThemeContext';
import type { SidePanelItem } from '../types';
import { spacing } from '../constants/theme';

interface Props {
  panels: SidePanelItem[];
  visible: boolean;
  onToggleExpand: (panelId: string) => void;
  onDismiss: (panelId: string) => void;
  onOpenJobCard: (panel: SidePanelItem) => void;
  onClose: () => void;
}

export function PanelBottomSheet({
  panels,
  visible,
  onToggleExpand,
  onDismiss,
  onOpenJobCard,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const snapPoints = useMemo(() => ['40%', '85%'], []);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  const bgStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderBottomWidth: 0,
    }),
    [colors],
  );

  const handleStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetHandle,
      width: 36,
      height: 4,
    }),
    [colors],
  );

  // Only mount when visible and there are panels
  if (!visible || panels.length === 0) return null;

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backgroundStyle={bgStyle}
      handleIndicatorStyle={handleStyle}
      enablePanDownToClose
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {panels.map((panel) => (
          <PanelCard
            key={panel.id}
            panel={panel}
            onToggleExpand={onToggleExpand}
            onDismiss={onDismiss}
            onOpenJobCard={onOpenJobCard}
          />
        ))}
        <View style={styles.bottomPad} />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
  },
  bottomPad: {
    height: 40,
  },
});
