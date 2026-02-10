import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ServicePackagesData } from '../types';
import { colors, spacing, borderRadius } from '../constants/theme';

interface Props {
  data: ServicePackagesData;
}

export function ServicePackagesCard({ data }: Props) {
  return (
    <View>
      {data.packages.map((pkg) => (
        <View key={pkg.id} style={styles.pkg}>
          <View style={styles.header}>
            <Text style={styles.name}>{pkg.name}</Text>
            <Text style={styles.price}>{`\u20B9${pkg.price.toLocaleString()}`}</Text>
          </View>

          {pkg.description ? (
            <Text style={styles.desc}>{pkg.description}</Text>
          ) : null}

          {pkg.includes.length > 0 && (
            <View style={styles.list}>
              {pkg.includes.map((item, j) => (
                <View key={j} style={styles.listItem}>
                  <Text style={styles.bullet}>{'\u2022'}</Text>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          {pkg.validityMonths > 0 && (
            <Text style={styles.validity}>
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
    backgroundColor: 'rgba(240, 235, 227, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.05)',
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
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  price: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  desc: {
    color: colors.textSecondary,
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
    color: colors.textMuted,
    fontSize: 13,
    marginRight: spacing.sm,
    lineHeight: 18,
  },
  listText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  validity: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
