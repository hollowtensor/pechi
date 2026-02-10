import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PanelCard } from './PanelCard';
import type { SidePanelItem } from '../types';
import { colors, spacing } from '../constants/theme';

interface Props {
  panels: SidePanelItem[];
  onToggleExpand: (panelId: string) => void;
  onDismiss: (panelId: string) => void;
  onOpenJobCard: (panel: SidePanelItem) => void;
}

export function PanelBottomSheet({
  panels,
  onToggleExpand,
  onDismiss,
  onOpenJobCard,
}: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['8%', '40%', '85%'], []);

  const handleSheetChanges = useCallback((_index: number) => {
    // could track sheet state here if needed
  }, []);

  if (panels.length === 0) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={false}
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
  sheetBackground: {
    backgroundColor: colors.sheetBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.06)',
    borderBottomWidth: 0,
  },
  handleIndicator: {
    backgroundColor: colors.sheetHandle,
    width: 36,
    height: 4,
  },
  content: {
    padding: spacing.lg,
  },
  bottomPad: {
    height: 40,
  },
});
