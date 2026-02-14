import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/auth-context';
import { FlashMessageProvider } from '@/context/flash-message-context';
import { ThemeOverridesProvider } from '@/context/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <ThemeOverridesProvider>
        <FlashMessageProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="login" options={{ title: 'Login' }} />
              <Stack.Screen name="register" options={{ title: 'Registro' }} />
              <Stack.Screen name="profile-setup" options={{ title: 'Perfil' }} />
              <Stack.Screen name="flow" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ title: 'Settings' }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: 'modal', title: 'Modal' }}
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </FlashMessageProvider>
      </ThemeOverridesProvider>
    </AuthProvider>
  );
}
