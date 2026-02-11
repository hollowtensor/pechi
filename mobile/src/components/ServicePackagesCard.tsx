import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { ServicePackagesData } from '../types';
import { spacing, borderRadius } from '../constants/theme';

interface Props {
  data: ServicePackagesData;
}

export function ServicePackagesCard({ data }: Props) {
  const { colors } = useTheme();
  return (
    <View>
      {data.packages.map((pkg) => (
        <View
          key={pkg.id}
          style={[styles.pkg, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <View style={styles.header}>
            <Text style={[styles.name, { color: colors.text }]}>{pkg.name}</Text>
            <Text style={[styles.price, { color: colors.accent }]}>
              {`\u20B9${pkg.price.toLocaleString()}`}
            </Text>
          </View>

          {pkg.description ? (
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              {pkg.description}
            </Text>
          ) : null}

          {pkg.includes.length > 0 && (
            <View style={styles.list}>
              {pkg.includes.map((item, j) => (
                <View key={j} style={styles.listItem}>
                  <Text style={[styles.bullet, { color: colors.textMuted }]}>
                    {'\u2022'}
                  </Text>
                  <Text style={[styles.listText, { color: colors.textSecondary }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {pkg.validityMonths > 0 && (
            <Text style={[styles.validity, { color: colors.textMuted }]}>
              Valid for {pkg.validityMonths} months
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pkg: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  list: {
    marginTop: spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    fontSize: 13,
    marginRight: spacing.sm,
    lineHeight: 18,
  },
  listText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  validity: {
    fontSize: 11,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
