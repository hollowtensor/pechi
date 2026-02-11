import React, { useCallback, useMemo } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { JOB_CARD_STATUS_ORDER, JOB_CARD_STATUS_LABELS } from '../../types';
import type { JobCardListItem, JobCardStatus } from '../../types';
import { StatusStepper } from './StatusStepper';
import { StatusTimeline } from './StatusTimeline';
import { ServiceChecklist } from './ServiceChecklist';
import { spacing, borderRadius } from '../../constants/theme';

interface Props {
  card: JobCardListItem;
  isAdvisor: boolean;
  onAdvanceStatus: (id: number, status: JobCardStatus) => void;
  onToggleChecklist: (id: number, key: string, checked: boolean) => void;
  onClose: () => void;
}

export function JobCardDetailModal({ card, isAdvisor, onAdvanceStatus, onToggleChecklist, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const nextStatus = useMemo(() => {
    const idx = JOB_CARD_STATUS_ORDER.indexOf(card.status);
    if (idx < JOB_CARD_STATUS_ORDER.length - 1) {
      return JOB_CARD_STATUS_ORDER[idx + 1];
    }
    return null;
  }, [card.status]);

  const checklistComplete = useMemo(() => {
    if (!card.checklist || card.checklist.length === 0) return true;
    return card.checklist.every((item) => item.checked);
  }, [card.checklist]);

  const handleAdvance = useCallback(() => {
    if (nextStatus && checklistComplete) onAdvanceStatus(card.id, nextStatus);
  }, [card.id, nextStatus, onAdvanceStatus, checklistComplete]);

  const costDisplay = card.actual_cost ?? card.total_estimate;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.surfaceBorder }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeBtn, { color: colors.accent }]}>Close</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Job #{card.id}
          </Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Stepper */}
          <StatusStepper currentStatus={card.status} />

          {/* Vehicle & Customer */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Vehicle</Text>
            <Text style={[styles.vehicleTitle, { color: colors.text }]}>
              {card.vehicle_model} {card.vehicle_variant}
            </Text>
            <View style={styles.row}>
              <DetailItem label="Registration" value={card.registration_no} colors={colors} />
              <DetailItem label="Mileage" value={`${(card.mileage || 0).toLocaleString()} km`} colors={colors} />
            </View>
            <View style={styles.row}>
              <DetailItem label="Customer" value={card.customer_name} colors={colors} />
              <DetailItem label="Phone" value={card.customer_phone} colors={colors} />
            </View>
          </View>

          {/* Service Items */}
          {card.service_items && card.service_items.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Service Items</Text>
              {card.service_items.map((item, i) => (
                <View key={i} style={[styles.listItem, i > 0 && { borderTopColor: colors.surfaceBorder, borderTopWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                    {item.description ? (
                      <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{item.description}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.itemCost, { color: colors.accent }]}>
                    ₹{item.cost.toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Parts */}
          {card.parts && card.parts.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Parts</Text>
              {card.parts.map((part, i) => (
                <View key={i} style={[styles.listItem, i > 0 && { borderTopColor: colors.surfaceBorder, borderTopWidth: 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{part.name}</Text>
                    <Text style={[styles.itemDesc, { color: colors.textMuted }]}>
                      {part.partNumber} × {part.quantity}
                    </Text>
                  </View>
                  <Text style={[styles.itemCost, { color: colors.accent }]}>
                    ₹{part.totalPrice.toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Service Checklist */}
          {card.checklist && card.checklist.length > 0 && (
            <ServiceChecklist
              checklist={card.checklist}
              isAdvisor={isAdvisor}
              onToggle={(key, checked) => onToggleChecklist(card.id, key, checked)}
            />
          )}

          {/* Cost Summary */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Cost</Text>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Estimated</Text>
              <Text style={[styles.costValue, { color: colors.text }]}>
                ₹{(card.total_estimate || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            {card.actual_cost != null && (
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Actual</Text>
                <Text style={[styles.costValue, { color: colors.accent, fontWeight: '700' }]}>
                  ₹{card.actual_cost.toLocaleString('en-IN')}
                </Text>
              </View>
            )}
            {card.assigned_technician && (
              <View style={styles.costRow}>
                <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Technician</Text>
                <Text style={[styles.costValue, { color: colors.text }]}>{card.assigned_technician}</Text>
              </View>
            )}
          </View>

          {/* Notes */}
          {card.notes ? (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>{card.notes}</Text>
            </View>
          ) : null}

          {/* Timeline */}
          <StatusTimeline history={card.status_history || []} />

          {/* Advance Button (Advisor only) */}
          {isAdvisor && nextStatus && (
            <>
              <TouchableOpacity
                style={[
                  styles.advanceBtn,
                  { backgroundColor: checklistComplete ? colors.accent : colors.textMuted },
                ]}
                onPress={handleAdvance}
                activeOpacity={0.8}
                disabled={!checklistComplete}
              >
                <Text style={styles.advanceBtnText}>
                  Advance to {JOB_CARD_STATUS_LABELS[nextStatus]}
                </Text>
              </TouchableOpacity>
              {!checklistComplete && (
                <Text style={[styles.checklistHint, { color: colors.textMuted }]}>
                  Complete all checklist items to advance
                </Text>
              )}
            </>
          )}

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function DetailItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  closeBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: spacing.xl,
  },
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
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemDesc: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  itemCost: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.md,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  costLabel: {
    fontSize: 14,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  advanceBtn: {
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  advanceBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  checklistHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
