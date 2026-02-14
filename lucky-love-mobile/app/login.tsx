import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Link, router, Stack } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_URL } from '@/constants/api';
import { useAuth } from '@/context/auth-context';
import { useFlashMessage } from '@/context/flash-message-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { logger } from '@/utils/logger';

export default function LoginScreen() {
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const { setAuth } = useAuth();
  const { showMessage } = useFlashMessage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, message?: string) => {
    const lowered = title.toLowerCase();
    const type = lowered.includes('error')
      ? 'error'
      : lowered.includes('listo')
        ? 'success'
        : 'info';

    showMessage({
      type,
      title,
      message: message ?? '',
    });
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showAlert('Datos incompletos', 'Ingresa email y password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data?.error ?? 'No se pudo iniciar sesion.');
        return;
      }

      const profile = data?.profile

      setAuth({
        userId: data?.user?.id ?? null,
        email: data?.user?.email ?? null,
        accessToken: data?.session?.access_token ?? null,
        profile: profile
          ? {
              userId: profile.user_id,
              email: profile.email,
              alias: profile.alias,
              coupleId: profile.couple_id,
              photoUrl: profile.photo_url,
              photoPath: profile.photo_path ?? null,
              themeLight: profile.theme_light ?? null,
              themeDark: profile.theme_dark ?? null,
              termsAcceptedAt: profile.terms_accepted_at ?? null,
              birthday: profile.birthday ?? null,
              favoriteFood: profile.favorite_food ?? null,
              personalityType: profile.personality_type ?? null,
              whatsappUrl: profile.whatsapp_url ?? null,
              instagramUrl: profile.instagram_url ?? null,
              tiktokUrl: profile.tiktok_url ?? null,
              linkedinUrl: profile.linkedin_url ?? null,
            }
          : null,
        couple: data?.couple
          ? {
              id: data.couple.id,
              code: data.couple.code,
              memberCount: data.couple.member_count,
              relationshipStartDate: data.couple.relationship_start_date ?? null,
              meetDate: data.couple.meet_date ?? null,
            }
          : null,
      });

      showAlert('Listo', 'Sesion iniciada.');

      if (profile?.couple_id) {
        router.replace('/flow');
      } else {
        router.replace('/profile-setup');
      }
    } catch (err) {
      logger.error('Login failed', err, { email: email.trim().toLowerCase() });
      showAlert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.hero}>
        <Image
          source={require('../assets/images/login_image.jpg')}
          style={styles.heroImage}
          contentFit="cover"
        />
        <ThemedText type="defaultSemiBold" style={styles.heroTitle}>
          Aplicacion dedicada a mi futura esposa
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}
      >
        <ThemedText type="subtitle">Iniciar sesion</ThemedText>
        <Input
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button
          label={loading ? 'Entrando...' : 'Entrar'}
          onPress={handleLogin}
          disabled={loading}
        />

        <Link href="/register" style={styles.link}>
          <ThemedText type="link" style={{ color: text }}>
            Crear cuenta
          </ThemedText>
        </Link>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 20,
  },
  hero: {
    gap: 12,
  },
  heroImage: {
    width: '100%',
    height: 260,
  },
  heroTitle: {
    textAlign: 'center',
    fontSize: 14,
    opacity: 0.8,
    paddingHorizontal: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 24,
    gap: 12,
  },
  link: {
    marginTop: 8,
    alignSelf: 'center',
  },
});
