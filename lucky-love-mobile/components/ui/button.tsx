import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'muted';

type ButtonProps = PressableProps & {
  variant?: ButtonVariant;
  label: string;
  loading?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-transparent',
  secondary: 'bg-transparent',
  ghost: 'bg-transparent',
  muted: 'bg-transparent',
};

export function Button({ label, variant = 'primary', disabled, loading, ...props }: ButtonProps) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const surface = useThemeColor({}, 'surface');
  const background = useThemeColor({}, 'background');

  const buttonStyle = [
    styles.base,
    variant === 'primary' ? { backgroundColor: tint } : null,
    variant === 'secondary' ? { backgroundColor: surface, borderColor: border } : null,
    variant === 'ghost' ? { backgroundColor: 'transparent', borderColor: border } : null,
    variant === 'muted' ? { backgroundColor: border } : null,
  ];

  const textColor =
    variant === 'primary' ? background : text;

  const indicatorColor = textColor;

  return (
    <Pressable
      className={`w-full items-center justify-center ${variantClasses[variant]} ${
        disabled || loading ? 'opacity-60' : ''
      }`}
      disabled={disabled || loading}
      style={buttonStyle}
      {...props}>
      <View className="flex-row items-center gap-2">
        {loading ? (
          <ActivityIndicator size="small" color={indicatorColor} />
        ) : null}
        <Text className="text-base font-semibold" style={{ color: textColor, textAlign: 'center' }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
