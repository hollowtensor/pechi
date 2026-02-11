import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';
import type { JobCard } from '../types';
import { spacing, borderRadius } from '../constants/theme';

interface Props {
  visible: boolean;
  jobCard: JobCard;
  onConfirm: (jobCard: JobCard) => void;
  onCancel: () => void;
  onUpdate: (jobCard: JobCard) => void;
}

export function JobCardModal({
  visible,
  jobCard,
  onConfirm,
  onCancel,
  onUpdate,
}: Props) {
  const { mode, colors } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleRemovePart = (index: number) => {
    const parts = jobCard.parts.filter((_, i) => i !== index);
    const total =
      (jobCard.servicePackage?.price ?? 0) +
      parts.reduce((s, p) => s + p.totalPrice, 0);
    onUpdate({ ...jobCard, parts, totalEstimate: total });
  };

  const handleRemovePackage = () => {
    const total = jobCard.parts.reduce((s, p) => s + p.totalPrice, 0);
    onUpdate({ ...jobCard, servicePackage: null, totalEstimate: total });
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      const iso = date.toISOString().split('T')[0];
      onUpdate({ ...jobCard, preferredDate: iso });
    }
  };

  const handleNotesChange = (text: string) => {
    onUpdate({ ...jobCard, notes: text });
  };

  const parseDate = () => {
    if (jobCard.preferredDate) {
      const d = new Date(jobCard.preferredDate);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Service Job Card
          </Text>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.surface }]}
            onPress={onCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>
              {'\u00D7'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer & Vehicle */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Customer & Vehicle
            </Text>
            <View style={styles.grid}>
              <Field label="Customer" value={jobCard.customer.name} />
              <Field label="Phone" value={jobCard.customer.phone} />
              <Field
                label="Vehicle"
                value={`${jobCard.vehicle.model} ${jobCard.vehicle.variant}`}
              />
              <Field label="Registration" value={jobCard.vehicle.registrationNo} />
              <Field
                label="Mileage"
                value={`${jobCard.vehicle.mileage.toLocaleString()} km`}
              />
            </View>
          </View>

          {/* Service Package */}
          {jobCard.servicePackage && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Service Package
              </Text>
              <View
                style={[
                  styles.pkgCard,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
              >
                <View style={styles.pkgTop}>
                  <View style={styles.pkgInfo}>
                    <Text style={[styles.pkgName, { color: colors.text }]}>
                      {jobCard.servicePackage.name}
                    </Text>
                    <Text style={[styles.pkgPrice, { color: colors.accent }]}>
                      {`\u20B9${jobCard.servicePackage.price.toLocaleString()}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: colors.surface }]}
                    onPress={handleRemovePackage}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.removeText, { color: colors.textMuted }]}>
                      {'\u00D7'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {jobCard.servicePackage.includes.map((item, i) => (
                  <View key={i} style={styles.includeRow}>
                    <Text style={[styles.bullet, { color: colors.textMuted }]}>
                      {'\u2022'}
                    </Text>
                    <Text style={[styles.includeText, { color: colors.textSecondary }]}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Parts */}
          {jobCard.parts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Parts
              </Text>
              {jobCard.parts.map((part, i) => (
                <View
                  key={i}
                  style={[
                    styles.lineItem,
                    { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                  ]}
                >
                  <View style={styles.lineInfo}>
                    <Text style={[styles.lineName, { color: colors.text }]}>
                      {part.name}
                    </Text>
                    <Text style={[styles.lineSub, { color: colors.textMuted }]}>
                      {part.partNumber}
                    </Text>
                  </View>
                  <Text style={[styles.linePrice, { color: colors.text }]}>
                    {`\u20B9${part.totalPrice.toLocaleString()}`}
                  </Text>
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: colors.surface }]}
                    onPress={() => handleRemovePart(i)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={[styles.removeText, { color: colors.textMuted }]}>
                      {'\u00D7'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Preferred Date */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Preferred Date
            </Text>
            <TouchableOpacity
              style={[
                styles.dateInput,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateText, { color: colors.text }]}>
                {jobCard.preferredDate || 'Select a date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={parseDate()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={handleDateChange}
                themeVariant={mode}
              />
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Notes
            </Text>
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  color: colors.text,
                },
              ]}
              value={jobCard.notes}
              onChangeText={handleNotesChange}
              placeholder="Any special requests..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Total */}
          <View style={[styles.totalRow, { borderTopColor: colors.surfaceBorder }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
              Total Estimate
            </Text>
            <Text style={[styles.totalAmount, { color: colors.accent }]}>
              {`\u20B9${jobCard.totalEstimate.toLocaleString()}`}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
              onPress={() => onConfirm(jobCard)}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>Confirm Booking</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.field,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
      ]}
    >
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 22,
    lineHeight: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  field: {
    width: '47%',
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  pkgCard: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  pkgTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  pkgInfo: {
    flex: 1,
  },
  pkgName: {
    fontSize: 15,
    fontWeight: '600',
  },
  pkgPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  includeRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    fontSize: 13,
    marginRight: spacing.sm,
  },
  includeText: {
    fontSize: 13,
    flex: 1,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lineInfo: {
    flex: 1,
  },
  lineName: {
    fontSize: 14,
    fontWeight: '500',
  },
  lineSub: {
    fontSize: 11,
    marginTop: 1,
  },
  linePrice: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: spacing.md,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    fontSize: 18,
    lineHeight: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
  },
  dateText: {
    fontSize: 15,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    fontSize: 15,
    minHeight: 80,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    marginBottom: spacing.xl,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
