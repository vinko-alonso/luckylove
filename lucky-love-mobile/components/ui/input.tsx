import { TextInput, type TextInputProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

type InputProps = TextInputProps;

export function Input({ placeholderTextColor, style, ...props }: InputProps) {
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const link = useThemeColor({}, 'link');

  return (
    <TextInput
      className="w-full rounded-lg border px-3 py-2 text-base"
      placeholderTextColor={placeholderTextColor ?? link}
      style={[
        {
          backgroundColor: background,
          borderColor: border,
          color: text,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
        },
        style,
      ]}
      {...props}
    />
  );
}
