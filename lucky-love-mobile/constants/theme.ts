/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Palette = {
  sand: '#ffe6a7',
  caramel: '#99582a',
  cacao: '#432818',
  honey: '#bb9457',
  wine: '#6f1d1b',
};

const tintColorLight = Palette.caramel;
const tintColorDark = Palette.honey;

export const Colors = {
  light: {
    text: Palette.cacao,
    background: Palette.sand,
    tint: tintColorLight,
    link: Palette.caramel,
    icon: Palette.cacao,
    tabIconDefault: Palette.cacao,
    tabIconSelected: tintColorLight,
    border: Palette.honey,
    surface: '#fff6d6',
  },
  dark: {
    text: Palette.sand,
    background: Palette.cacao,
    tint: tintColorDark,
    link: Palette.honey,
    icon: Palette.sand,
    tabIconDefault: Palette.sand,
    tabIconSelected: tintColorDark,
    border: Palette.honey,
    surface: '#3a1f15',
  },
};

function clampAlpha(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function withAlpha(hex: string, alpha: number) {
  const normalized = hex.trim().replace('#', '');
  if (normalized.length !== 6) {
    return hex;
  }
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clampAlpha(alpha)})`;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
