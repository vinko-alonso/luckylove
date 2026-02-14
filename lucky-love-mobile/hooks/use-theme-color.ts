/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeOverrides } from '@/context/theme-context';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];
  const { overrides } = useThemeOverrides();

  const override = overrides[theme][colorName];

  if (colorFromProps) {
    return colorFromProps;
  } else if (override) {
    return override;
  } else {
    return Colors[theme][colorName];
  }
}
