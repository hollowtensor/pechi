import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import type { PartsListData } from '../types';
import { spacing, borderRadius } from '../constants/theme';

interface Props {
  data: PartsListData;
}

export function PartsListCard({ data }: Props) {
  const { colors } = useTheme();
  return (
    <View>
      {data.parts.map((p, i) => (
        <View
          key={i}
          style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]}>{p.name}</Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                {p.partNumber}
                {p.category ? ` \u00B7 ${p.category}` : ''}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.price, { color: colors.text }]}>
                {`\u20B9${p.price.toLocaleString()}`}
              </Text>
              <View
                style={[
                  styles.stockBadge,
                  {
                    backgroundColor: p.inStock
                      ? 'rgba(76, 175, 80, 0.15)'
                      : 'rgba(244, 67, 54, 0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.stockText,
                    { color: p.inStock ? colors.stockGreen : colors.stockRed },
                  ]}
                >
                  {p.inStock ? 'In Stock' : 'Out'}
                </Text>
              </View>
            </View>
          </View>
          {p.compatibleModels ? (
            <Text style={[styles.compat, { color: colors.textMuted }]}>
              {p.compatibleModels}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderWidth: 1,
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
    fontSize: 14,
    fontWeight: '500',
  },
  sub: {
    fontSize: 11,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
  },
  stockBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '600',
  },
  compat: {
    fontSize: 11,
    marginTop: spacing.sm,
  },
});
