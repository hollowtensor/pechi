import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PartsListData } from '../types';
import { colors, spacing, borderRadius } from '../constants/theme';

interface Props {
  data: PartsListData;
}

export function PartsListCard({ data }: Props) {
  return (
    <View>
      {data.parts.map((p, i) => (
        <View key={i} style={styles.item}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.sub}>
                {p.partNumber}
                {p.category ? ` \u00B7 ${p.category}` : ''}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.price}>{`\u20B9${p.price.toLocaleString()}`}</Text>
              <View
                style={[
                  styles.stockBadge,
                  p.inStock ? styles.stockYes : styles.stockNo,
                ]}
              >
                <Text
                  style={[
                    styles.stockText,
                    p.inStock ? styles.stockTextYes : styles.stockTextNo,
                  ]}
                >
                  {p.inStock ? 'In Stock' : 'Out'}
                </Text>
              </View>
            </View>
          </View>
          {p.compatibleModels ? (
            <Text style={styles.compat}>{p.compatibleModels}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: 'rgba(240, 235, 227, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(240, 235, 227, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  stockBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  stockYes: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  stockNo: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
  },
  stockTextYes: {
    color: colors.stockGreen,
  },
  stockTextNo: {
    color: colors.stockRed,
  },
  compat: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.sm,
  },
});
