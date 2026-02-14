import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/constants/api';
import { withAlpha } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFlashMessage } from '@/context/flash-message-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { logger } from '@/utils/logger';

const imageMediaType =
  (ImagePicker as { MediaType?: { Images?: string } }).MediaType?.Images ??
  (ImagePicker as { MediaTypeOptions?: { Images?: string } }).MediaTypeOptions?.Images;

export default function ProfileSetupScreen() {
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const { state, updateProfile, updateCouple, clearAuth } = useAuth();
  const { showMessage } = useFlashMessage();
  const [alias, setAlias] = useState(state.profile?.alias ?? '');
  const [photoUrl, setPhotoUrl] = useState(state.profile?.photoUrl ?? '');
  const [photoPath, setPhotoPath] = useState(state.profile?.photoPath ?? '');
  const [connectCode, setConnectCode] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);

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
    if (!state.userId) {
      router.replace('/login');
    }
  }, [state.userId]);

  const shouldShowTerms = Boolean(state.userId) && !state.profile?.termsAcceptedAt;

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showAlert('Permiso requerido', 'Necesitamos acceso a tus fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imageMediaType,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: 'profile.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      formData.append('scope', 'user');
      formData.append('model', 'profile');
      formData.append('modelId', state.userId ?? '');
      formData.append('date', new Date().toISOString().slice(0, 10));

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: state.accessToken ? `Bearer ${state.accessToken}` : '',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data?.error ?? 'No se pudo subir la imagen.');
        return;
      }

      setPhotoPath(data.path ?? '');
      setPhotoUrl(data.signedUrl ?? '');
      if (state.userId && state.email && data.path) {
        updateProfile({
          userId: state.userId,
          email: state.email,
          alias: alias || null,
          coupleId: state.profile?.coupleId ?? null,
          photoUrl: data.signedUrl ?? null,
          photoPath: data.path ?? null,
          themeLight: state.profile?.themeLight ?? null,
          themeDark: state.profile?.themeDark ?? null,
          termsAcceptedAt: state.profile?.termsAcceptedAt ?? null,
          birthday: state.profile?.birthday ?? null,
          favoriteFood: state.profile?.favoriteFood ?? null,
          personalityType: state.profile?.personalityType ?? null,
          whatsappUrl: state.profile?.whatsappUrl ?? null,
          instagramUrl: state.profile?.instagramUrl ?? null,
          tiktokUrl: state.profile?.tiktokUrl ?? null,
          linkedinUrl: state.profile?.linkedinUrl ?? null,
        });
      }
    } catch (err) {
      logger.error('Upload failed', err);
      showAlert('Error', 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!state.userId) {
      clearAuth();
      router.replace('/login');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/profiles/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: state.accessToken ? `Bearer ${state.accessToken}` : '',
        },
        body: JSON.stringify({
          userId: state.userId,
          alias,
          photoUrl: photoPath || state.profile?.photoPath || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data?.error ?? 'No se pudo guardar el perfil.');
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
      logger.error('Profile update failed', err, { userId: state.userId });
      showAlert('Error', 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptTerms = async () => {
    if (!state.accessToken) return;
    setAcceptingTerms(true);
    try {
      const response = await fetch(`${API_URL}/profiles/accept-terms`, {
        method: 'POST',
        headers: {
          Authorization: state.accessToken ? `Bearer ${state.accessToken}` : '',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data?.error ?? 'No se pudo aceptar los terminos.');
        return;
      }

      if (data?.profile?.terms_accepted_at && state.profile) {
        updateProfile({
          ...state.profile,
          termsAcceptedAt: data.profile.terms_accepted_at ?? null,
        });
      }

    } catch (err) {
      logger.error('Accept terms failed', err);
      showAlert('Error', 'No se pudo aceptar los terminos.');
    } finally {
      setAcceptingTerms(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!state.userId) {
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch(`${API_URL}/profiles/generate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: state.accessToken ? `Bearer ${state.accessToken}` : '',
        },
        body: JSON.stringify({ userId: state.userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data?.error ?? 'No se pudo generar el codigo.');
        return;
      }

      setConnectCode(data.code ?? '');
    } catch (err) {
      logger.error('Generate code failed', err, { userId: state.userId });
      showAlert('Error', 'No se pudo generar el codigo.');
    } finally {
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!state.userId || !partnerCode.trim()) {
      showAlert('Datos incompletos', 'Ingresa el codigo de tu pareja.');
      return;
    }

    setConnecting(true);
    try {
      const response = await fetch(`${API_URL}/couples/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: state.accessToken ? `Bearer ${state.accessToken}` : '',
        },
        body: JSON.stringify({
          userId: state.userId,
          code: partnerCode.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data?.error ?? 'No se pudo conectar.');
        return;
      }

      if (data?.couple) {
        updateCouple({
          id: data.couple.id,
          code: data.couple.code,
          memberCount: data.couple.member_count,
          relationshipStartDate: data.couple.relationship_start_date ?? null,
          meetDate: data.couple.meet_date ?? null,
        });
      }

      showAlert('Listo', 'Pareja conectada.');
      router.replace('/flow');
    } catch (err) {
      logger.error('Connect failed', err, { userId: state.userId });
      showAlert('Error', 'No se pudo conectar.');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Modal
        animationType="fade"
        transparent
        visible={shouldShowTerms}
        onRequestClose={() => {}}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: surface }]}>
            <ThemedText type="subtitle">Terminos de servicio</ThemedText>
            <ThemedText style={[styles.termsText, { color: text }]}>
              Aceptas pasar una vida completa a mi lado? Mi Lucky
            </ThemedText>
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button
                  label={acceptingTerms ? 'Aceptando...' : 'Aceptar'}
                  onPress={handleAcceptTerms}
                  disabled={acceptingTerms}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <ThemedText type="title">Tu perfil</ThemedText>

      <View style={styles.photoBlock}>
        <Pressable onPress={handlePickImage} disabled={uploading}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} />
          ) : (
            <View
              style={[
                styles.photoPlaceholder,
                { backgroundColor: withAlpha(tint, 0.4) },
              ]}
            />
          )}
        </Pressable>
        <Button
          label={
            uploading
              ? 'Subiendo...'
              : photoPath
                ? 'Foto lista (OK)'
                : 'Agregar foto'
          }
          onPress={handlePickImage}
          loading={uploading}
          variant="secondary"
        />
      </View>

      <Input
        placeholder="Alias"
        value={alias}
        onChangeText={setAlias}
      />

      <Button
        label={saving ? 'Guardando...' : 'Guardar perfil'}
        onPress={handleSaveProfile}
        disabled={saving}
      />

      <View style={styles.section}>
        <ThemedText type="subtitle">Conectar</ThemedText>
        <ThemedText>
          Comparte tu codigo o ingresa el de tu pareja para conectar.
        </ThemedText>

        {connectCode ? (
          <View style={styles.codeBox}>
            <ThemedText type="defaultSemiBold" style={styles.codeLabel}>
              Tu codigo
            </ThemedText>
            <ThemedText type="title" style={styles.codeValue}>
              {connectCode}
            </ThemedText>
          </View>
        ) : (
          <Button
            label={connecting ? 'Generando...' : 'Generar codigo'}
            onPress={handleGenerateCode}
            disabled={connecting}
            variant="ghost"
          />
        )}

        <Input
          placeholder="Codigo de tu pareja"
          value={partnerCode}
          onChangeText={setPartnerCode}
        />

        <Button
          label={connecting ? 'Conectando...' : 'Conectar'}
          onPress={handleConnect}
          disabled={connecting}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  photoBlock: {
    gap: 12,
    alignItems: 'center',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  termsText: {
    textAlign: 'center',
  },
  modalButtonRow: {
    flexDirection: 'row',
  },
  modalButtonPrimary: {
    flex: 1,
  },
  codeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  codeLabel: {
    textAlign: 'center',
  },
  codeValue: {
    fontSize: 32,
    textAlign: 'center',
  },
  section: {
    marginTop: 16,
    gap: 12,
  },
});
