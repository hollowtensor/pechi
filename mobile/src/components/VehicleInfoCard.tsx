import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { VehicleInfoData } from '../types';
import { spacing } from '../constants/theme';

interface Props {
  data: VehicleInfoData;
}

function Field({ label, value }: { label: string; value: string | number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function VehicleInfoCard({ data }: Props) {
  const { customer, vehicle } = data;
  return (
    <View style={styles.grid}>
      {customer.name ? <Field label="Customer" value={customer.name} /> : null}
      {customer.phone ? <Field label="Phone" value={customer.phone} /> : null}
      <Field label="Model" value={`${vehicle.model} ${vehicle.variant}`} />
      <Field label="Registration" value={vehicle.registrationNo} />
      {vehicle.year > 0 ? <Field label="Year" value={vehicle.year} /> : null}
      {vehicle.fuelType ? <Field label="Fuel" value={vehicle.fuelType} /> : null}
      {vehicle.color ? <Field label="Color" value={vehicle.color} /> : null}
      {vehicle.mileage > 0 ? (
        <Field label="Mileage" value={`${vehicle.mileage.toLocaleString()} km`} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  label: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
});
