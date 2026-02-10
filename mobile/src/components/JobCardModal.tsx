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
import type { JobCard } from '../types';
import { colors, spacing, borderRadius } from '../constants/theme';

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
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Service Job Card</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onCancel}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeText}>{'\u00D7'}</Text>
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
            <Text style={styles.sectionTitle}>Customer & Vehicle</Text>
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
              <Text style={styles.sectionTitle}>Service Package</Text>
              <View style={styles.pkgCard}>
                <View style={styles.pkgTop}>
                  <View style={styles.pkgInfo}>
                    <Text style={styles.pkgName}>
                      {jobCard.servicePackage.name}
                    </Text>
                    <Text style={styles.pkgPrice}>
                      {`\u20B9${jobCard.servicePackage.price.toLocaleString()}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={handleRemovePackage}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.removeText}>{'\u00D7'}</Text>
                  </TouchableOpacity>
                </View>
                {jobCard.servicePackage.includes.map((item, i) => (
                  <View key={i} style={styles.includeRow}>
                    <Text style={styles.bullet}>{'\u2022'}</Text>
                    <Text style={styles.includeText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Parts */}
          {jobCard.parts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Parts</Text>
              {jobCard.parts.map((part, i) => (
                <View key={i} style={styles.lineItem}>
                  <View style={styles.lineInfo}>
                    <Text style={styles.lineName}>{part.name}</Text>
                    <Text style={styles.lineSub}>{part.partNumber}</Text>
                  </View>
                  <Text style={styles.linePrice}>
                    {`\u20B9${part.totalPrice.toLocaleString()}`}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemovePart(i)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.removeText}>{'\u00D7'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Preferred Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dateText}>
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
                themeVariant="dark"
              />
            )}
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.notesInput}
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
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Estimate</Text>
            <Text style={styles.totalAmount}>
              {`\u20B9${jobCard.totalEstimate.toLocaleString()}`}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
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
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(240, 235, 227, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    backgroundColor: 'rgba(240, 235, 227, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.05)',
    padding: spacing.md,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  pkgCard: {
    backgroundColor: 'rgba(240, 235, 227, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.06)',
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
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  pkgPrice: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  includeRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    color: colors.textMuted,
    fontSize: 13,
    marginRight: spacing.sm,
  },
  includeText: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 235, 227, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lineInfo: {
    flex: 1,
  },
  lineName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  lineSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  linePrice: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: spacing.md,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(240, 235, 227, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: colors.textMuted,
    fontSize: 18,
    lineHeight: 20,
  },
  dateInput: {
    backgroundColor: 'rgba(240, 235, 227, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.08)',
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
  },
  dateText: {
    color: colors.text,
    fontSize: 15,
  },
  notesInput: {
    backgroundColor: 'rgba(240, 235, 227, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.08)',
    borderRadius: borderRadius.sm,
    padding: spacing.lg,
    color: colors.text,
    fontSize: 15,
    minHeight: 80,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    marginBottom: spacing.xl,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(240, 235, 227, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.1)',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
});
