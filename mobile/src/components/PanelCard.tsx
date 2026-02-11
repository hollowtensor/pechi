import React from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import type { SidePanelItem } from '../types';
import { VehicleInfoCard } from './VehicleInfoCard';
import { ServiceHistoryCard } from './ServiceHistoryCard';
import { PartsListCard } from './PartsListCard';
import { ServicePackagesCard } from './ServicePackagesCard';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, borderRadius } from '../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TYPE_LABELS: Record<string, string> = {
  vehicle_info: 'Vehicle',
  service_history: 'History',
  parts_list: 'Parts',
  service_packages: 'Packages',
  job_card: 'Job Card',
};

interface Props {
  panel: SidePanelItem;
  onToggleExpand: (panelId: string) => void;
  onDismiss: (panelId: string) => void;
  onOpenJobCard: (panel: SidePanelItem) => void;
}

export function PanelCard({ panel, onToggleExpand, onDismiss, onOpenJobCard }: Props) {
  const { colors } = useTheme();

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (panel.content.type === 'job_card' && !panel.isExpanded) {
      onOpenJobCard(panel);
    } else {
      onToggleExpand(panel.id);
    }
  };

  const renderContent = () => {
    switch (panel.content.type) {
      case 'vehicle_info':
        return <VehicleInfoCard data={panel.content.data} />;
      case 'service_history':
        return <ServiceHistoryCard data={panel.content.data} />;
      case 'parts_list':
        return <PartsListCard data={panel.content.data} />;
      case 'service_packages':
        return <ServicePackagesCard data={panel.content.data} />;
      case 'job_card':
        return (
          <TouchableOpacity
            style={[
              styles.jobCardButton,
              {
                backgroundColor: colors.accentSurface,
                borderColor: colors.accentBorder,
              },
            ]}
            onPress={() => onOpenJobCard(panel)}
            activeOpacity={0.7}
          >
            <Text style={[styles.jobCardButtonText, { color: colors.accent }]}>
              Open Job Card
            </Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.surfaceBorder,
        },
      ]}
    >
      <TouchableOpacity style={styles.header} onPress={handleToggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.surface },
              panel.isActionable && {
                backgroundColor: colors.accentSurface,
                borderWidth: 1,
                borderColor: colors.accentBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: panel.isActionable ? colors.accent : colors.textMuted },
              ]}
            >
              {TYPE_LABELS[panel.panelType] || panel.panelType}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {panel.title}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {!panel.isActionable && (
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => onDismiss(panel.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.dismissText, { color: colors.textMuted }]}>
                {'\u00D7'}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.chevron, { color: colors.textMuted }]}>
            {panel.isExpanded ? '\u25B4' : '\u25BE'}
          </Text>
        </View>
      </TouchableOpacity>

      {panel.isExpanded && (
        <View style={styles.body}>{renderContent()}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 18,
  },
  chevron: {
    fontSize: 12,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  jobCardButton: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  jobCardButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
