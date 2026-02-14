import { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, withAlpha } from '@/constants/theme';
import { API_URL } from '@/constants/api';
import { useAuth } from '@/context/auth-context';
import { useFlashMessage } from '@/context/flash-message-context';
import { useThemeOverrides } from '@/context/theme-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { logger } from '@/utils/logger';

const COLOR_KEYS = ['background', 'text', 'tint', 'link', 'surface', 'border'] as const;

type ThemeKey = (typeof COLOR_KEYS)[number];

type SettingsViewProps = {
  spotifyCode?: string;
};

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
}

function isValidHex(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value);
}

function clampChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  if (!isValidHex(normalized)) {
    return { r: 255, g: 255, b: 255 };
  }

  const raw = normalized.slice(1);
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return { r, g, b };
}

function toHexChannel(value: number) {
  return clampChannel(value).toString(16).padStart(2, '0');
}

function rgbToHex(rgb: { r: number; g: number; b: number }) {
  return `#${toHexChannel(rgb.r)}${toHexChannel(rgb.g)}${toHexChannel(rgb.b)}`;
}

const useSettingsStyles = () => {
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');

  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          padding: 24,
          gap: 16,
        },
        card: {
          padding: 16,
          borderRadius: 16,
          gap: 12,
        },
        paletteGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        },
        paletteItem: {
          width: '30%',
          gap: 6,
          alignItems: 'center',
        },
        paletteSwatch: {
          width: 56,
          height: 44,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: text,
        },
        paletteLabel: {
          fontSize: 12,
          textTransform: 'capitalize',
        },
        themeTabRow: {
          flexDirection: 'row',
          gap: 10,
        },
        themeTab: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: 12,
          alignItems: 'center',
          backgroundColor: withAlpha(tint, 0.12),
        },
        themeTabActive: {
          backgroundColor: withAlpha(tint, 0.24),
        },
        modalActionsRow: {
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: withAlpha(text, 0.35),
          justifyContent: 'flex-end',
        },
        modalCard: {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          gap: 16,
          backgroundColor: surface,
        },
        pickerPreview: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        pickerSwatch: {
          width: 48,
          height: 32,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: text,
        },
        sliderStack: {
          gap: 12,
        },
        sliderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        sliderLabel: {
          width: 18,
        },
        slider: {
          flex: 1,
        },
        sliderValue: {
          width: 36,
          textAlign: 'right',
        },
        modalActions: {
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
      }),
    [border, surface, text, tint]
  );
};

export function SettingsView({ spotifyCode }: SettingsViewProps) {
  const styles = useSettingsStyles();
  const { state, updateProfile, clearAuth } = useAuth();
  const { showMessage } = useFlashMessage();
  const { overrides, updateOverrides, resetOverrides } = useThemeOverrides();

  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');

  const [alias, setAlias] = useState(state.profile?.alias ?? '');
  const [spotifyStatus, setSpotifyStatus] = useState<string>('Sin conexion');
  const [saving, setSaving] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const initialLight = useMemo(() => {
    const base = Colors.light;
    const override = overrides.light;

    return COLOR_KEYS.reduce((acc, key) => {
      acc[key] = override[key] ?? base[key];
      return acc;
    }, {} as Record<ThemeKey, string>);
  }, [overrides.light]);

  const initialDark = useMemo(() => {
    const base = Colors.dark;
    const override = overrides.dark;

    return COLOR_KEYS.reduce((acc, key) => {
      acc[key] = override[key] ?? base[key];
      return acc;
    }, {} as Record<ThemeKey, string>);
  }, [overrides.dark]);

  const [lightColors, setLightColors] = useState(initialLight);
  const [darkColors, setDarkColors] = useState(initialDark);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [themeTab, setThemeTab] = useState<'light' | 'dark'>('light');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'light' | 'dark'>('light');
  const [pickerKey, setPickerKey] = useState<ThemeKey>('background');
  const [pickerRgb, setPickerRgb] = useState({ r: 255, g: 255, b: 255 });
  const pickerColor = useMemo(() => rgbToHex(pickerRgb), [pickerRgb]);

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

  useEffect(() => {
    setLightColors(initialLight);
  }, [initialLight]);

  useEffect(() => {
    setDarkColors(initialDark);
  }, [initialDark]);

  useEffect(() => {
    if (!spotifyCode || !state.accessToken) {
      return;
    }

    const exchange = async () => {
      try {
        const response = await fetch(`${API_URL}/spotify/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.accessToken}`,
          },
          body: JSON.stringify({ code: spotifyCode }),
        });

        const data = await response.json();

        if (!response.ok) {
          setSpotifyStatus('Error de conexion');
          return;
        }

        if (data?.success) {
          setSpotifyStatus('Spotify conectado');
        }
      } catch (err) {
        logger.error('Spotify exchange failed', err);
        setSpotifyStatus('Error de conexion');
      }
    };

    exchange();
  }, [spotifyCode, state.accessToken]);

  const handleSaveProfile = async () => {
    if (!state.accessToken || !state.userId) {
      showAlert('Error', 'Inicia sesion de nuevo.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/profiles/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.accessToken}`,
        },
        body: JSON.stringify({
          userId: state.userId,
          alias,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data?.error ?? 'No se pudo guardar.');
        return;
      }

      if (data?.profile) {
        updateProfile({
          userId: data.profile.user_id,
          email: data.profile.email,
          alias: data.profile.alias,
          coupleId: data.profile.couple_id,
          photoUrl: data.profile.photo_url,
          photoPath: data.profile.photo_path ?? null,
          themeLight: data.profile.theme_light ?? null,
          themeDark: data.profile.theme_dark ?? null,
          termsAcceptedAt: data.profile.terms_accepted_at ?? null,
          birthday: data.profile.birthday ?? null,
          favoriteFood: data.profile.favorite_food ?? null,
          personalityType: data.profile.personality_type ?? null,
          whatsappUrl: data.profile.whatsapp_url ?? null,
          instagramUrl: data.profile.instagram_url ?? null,
          tiktokUrl: data.profile.tiktok_url ?? null,
          linkedinUrl: data.profile.linkedin_url ?? null,
        });
      }

      showAlert('Listo', 'Perfil actualizado.');
    } catch (err) {
      logger.error('Settings profile update failed', err);
      showAlert('Error', 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const buildNormalizedColors = (colors: Record<ThemeKey, string>) => {
    const updates: Record<ThemeKey, string> = {
      background: Colors.light.background,
      text: Colors.light.text,
      tint: Colors.light.tint,
      link: Colors.light.link,
      surface: Colors.light.surface,
      border: Colors.light.border,
    };

    for (const key of COLOR_KEYS) {
      const value = normalizeHex(colors[key]);
      if (!value || !isValidHex(value)) {
        showAlert('Error', `Color invalido en ${key}. Usa formato #RRGGBB.`);
        return null;
      }
      updates[key] = value;
    }

    return updates;
  };

  const saveThemeOverrides = async (
    nextLight: Record<ThemeKey, string> | null,
    nextDark: Record<ThemeKey, string> | null
  ) => {
    if (!state.accessToken || !state.userId) {
      showAlert('Error', 'Inicia sesion de nuevo.');
      return;
    }

    setSavingTheme(true);
    try {
      const response = await fetch(`${API_URL}/profiles/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.accessToken}`,
        },
        body: JSON.stringify({
          userId: state.userId,
          themeLight: nextLight,
          themeDark: nextDark,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data?.error ?? 'No se pudo guardar el tema.');
        return;
      }

      if (data?.profile) {
        updateProfile({
          userId: data.profile.user_id,
          email: data.profile.email,
          alias: data.profile.alias,
          coupleId: data.profile.couple_id,
          photoUrl: data.profile.photo_url,
          photoPath: data.profile.photo_path ?? null,
          themeLight: data.profile.theme_light ?? null,
          themeDark: data.profile.theme_dark ?? null,
          birthday: data.profile.birthday ?? null,
          favoriteFood: data.profile.favorite_food ?? null,
          personalityType: data.profile.personality_type ?? null,
          whatsappUrl: data.profile.whatsapp_url ?? null,
          instagramUrl: data.profile.instagram_url ?? null,
          tiktokUrl: data.profile.tiktok_url ?? null,
          linkedinUrl: data.profile.linkedin_url ?? null,
          termsAcceptedAt: data.profile.terms_accepted_at ?? null,
        });
      }
    } catch (err) {
      logger.error('Theme update failed', err);
      showAlert('Error', 'No se pudo guardar el tema.');
    } finally {
      setSavingTheme(false);
    }
  };

  const applyColors = () => {
    const nextLight = buildNormalizedColors(lightColors);
    const nextDark = buildNormalizedColors(darkColors);

    if (!nextLight || !nextDark) {
      return;
    }

    setLightColors(nextLight);
    setDarkColors(nextDark);
    updateOverrides('light', nextLight);
    updateOverrides('dark', nextDark);
    saveThemeOverrides(nextLight, nextDark);
  };

  const openPicker = (mode: 'light' | 'dark', key: ThemeKey) => {
    const current = mode === 'light' ? lightColors[key] : darkColors[key];
    setPickerMode(mode);
    setPickerKey(key);
    setPickerRgb(hexToRgb(current));
    setPickerVisible(true);
  };

  const handlePickColor = (value: string) => {
    const normalized = normalizeHex(value);
    if (pickerMode === 'light') {
      setLightColors((prev) => ({ ...prev, [pickerKey]: normalized }));
    } else {
      setDarkColors((prev) => ({ ...prev, [pickerKey]: normalized }));
    }
  };

  const handleChannelChange = (channel: 'r' | 'g' | 'b', value: number) => {
    setPickerRgb((prev) => ({
      ...prev,
      [channel]: clampChannel(value),
    }));
  };

  const handleResetTheme = () => {
    resetOverrides();
    setLightColors({
      background: Colors.light.background,
      text: Colors.light.text,
      tint: Colors.light.tint,
      link: Colors.light.link,
      surface: Colors.light.surface,
      border: Colors.light.border,
    });
    setDarkColors({
      background: Colors.dark.background,
      text: Colors.dark.text,
      tint: Colors.dark.tint,
      link: Colors.dark.link,
      surface: Colors.dark.surface,
      border: Colors.dark.border,
    });
    saveThemeOverrides(null, null);
  };

  const handleSpotifyConnect = async () => {
    if (!state.accessToken) {
      showAlert('Error', 'Inicia sesion de nuevo.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/spotify/auth-url`, {
        headers: {
          Authorization: `Bearer ${state.accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        showAlert('Error', data?.error ?? 'No se pudo conectar Spotify.');
        return;
      }

      setSpotifyStatus('Conectando...');
      await Linking.openURL(data.url);
    } catch (err) {
      logger.error('Spotify connect failed', err);
      showAlert('Error', 'No se pudo abrir Spotify.');
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Settings</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Perfil</ThemedText>
        <Input placeholder="Alias" value={alias} onChangeText={setAlias} />
        <Button
          label={saving ? 'Guardando...' : 'Guardar cambios'}
          onPress={handleSaveProfile}
          disabled={saving}
        />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Spotify</ThemedText>
        <ThemedText>{spotifyStatus}</ThemedText>
        <Button label="Conectar Spotify" variant="secondary" onPress={handleSpotifyConnect} />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Colores</ThemedText>
        <ThemedText>Personaliza los colores del tema.</ThemedText>
        <Button
          label="Editar colores"
          variant="secondary"
          onPress={() => setThemeModalVisible(true)}
        />
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Otros</ThemedText>
        <Button label="Restablecer tema" variant="ghost" onPress={handleResetTheme} />
        <Button label="Cerrar sesion" variant="ghost" onPress={handleLogout} />
      </ThemedView>

      <Modal visible={themeModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setThemeModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Colores</ThemedText>
            <View style={styles.themeTabRow}>
              <Pressable
                style={[styles.themeTab, themeTab === 'light' && styles.themeTabActive]}
                onPress={() => setThemeTab('light')}>
                <ThemedText type="defaultSemiBold">Claro</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.themeTab, themeTab === 'dark' && styles.themeTabActive]}
                onPress={() => setThemeTab('dark')}>
                <ThemedText type="defaultSemiBold">Oscuro</ThemedText>
              </Pressable>
            </View>

            <View style={styles.paletteGrid}>
              {COLOR_KEYS.map((key) => (
                <Pressable
                  key={`${themeTab}-${key}`}
                  style={styles.paletteItem}
                  onPress={() => openPicker(themeTab, key)}>
                  <View
                    style={[
                      styles.paletteSwatch,
                      { backgroundColor: themeTab === 'light' ? lightColors[key] : darkColors[key] },
                    ]}
                  />
                  <ThemedText style={styles.paletteLabel}>{key}</ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActionsRow}>
              <Button
                label={savingTheme ? 'Guardando...' : 'Guardar'}
                variant="primary"
                onPress={applyColors}
                disabled={savingTheme}
              />
              <Button
                label="Cerrar"
                variant="muted"
                onPress={() => setThemeModalVisible(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={pickerVisible} transparent animationType="slide">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Color para {pickerKey}</ThemedText>
            <View style={styles.pickerPreview}>
              <View style={[styles.pickerSwatch, { backgroundColor: pickerColor }]} />
              <ThemedText>{normalizeHex(pickerColor)}</ThemedText>
            </View>
            <View style={styles.sliderStack}>
              <View style={styles.sliderRow}>
                <ThemedText style={styles.sliderLabel}>R</ThemedText>
                <Slider
                  value={pickerRgb.r}
                  minimumValue={0}
                  maximumValue={255}
                  step={1}
                  minimumTrackTintColor={tint}
                  maximumTrackTintColor={border}
                  thumbTintColor={text}
                  onValueChange={(value) => handleChannelChange('r', value)}
                  style={styles.slider}
                />
                <ThemedText style={styles.sliderValue}>{pickerRgb.r}</ThemedText>
              </View>
              <View style={styles.sliderRow}>
                <ThemedText style={styles.sliderLabel}>G</ThemedText>
                <Slider
                  value={pickerRgb.g}
                  minimumValue={0}
                  maximumValue={255}
                  step={1}
                  minimumTrackTintColor={tint}
                  maximumTrackTintColor={border}
                  thumbTintColor={text}
                  onValueChange={(value) => handleChannelChange('g', value)}
                  style={styles.slider}
                />
                <ThemedText style={styles.sliderValue}>{pickerRgb.g}</ThemedText>
              </View>
              <View style={styles.sliderRow}>
                <ThemedText style={styles.sliderLabel}>B</ThemedText>
                <Slider
                  value={pickerRgb.b}
                  minimumValue={0}
                  maximumValue={255}
                  step={1}
                  minimumTrackTintColor={tint}
                  maximumTrackTintColor={border}
                  thumbTintColor={text}
                  onValueChange={(value) => handleChannelChange('b', value)}
                  style={styles.slider}
                />
                <ThemedText style={styles.sliderValue}>{pickerRgb.b}</ThemedText>
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  handlePickColor(pickerColor);
                  setPickerVisible(false);
                }}>
                <ThemedText type="link">Guardar</ThemedText>
              </Pressable>
              <Pressable onPress={() => setPickerVisible(false)}>
                <ThemedText type="link">Cancelar</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

