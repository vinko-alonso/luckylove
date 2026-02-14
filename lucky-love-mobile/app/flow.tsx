import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { addMonths, differenceInCalendarDays, endOfMonth, format, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Input } from '@/components/ui/input';
import { SettingsView } from '@/components/settings-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_URL } from '@/constants/api';
import { withAlpha } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFlashMessage } from '@/context/flash-message-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { logger } from '@/utils/logger';

const CARD_SPACING = 16;

const useThemeTokens = () => {
  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const link = useThemeColor({}, 'link');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');

  return { background, text, tint, link, surface, border };
};

const useFlowStyles = () => {
  const { background, text, tint, link, surface, border } = useThemeTokens();

  return useMemo(
    () =>
      StyleSheet.create({
        flowRoot: {
          flex: 1,
        },
        page: {
          flex: 1,
        },
        container: {
          flex: 1,
          padding: 24,
          gap: 16,
        },
        card: {
          padding: 16,
          borderRadius: 16,
          gap: 8,
        },
        rewardHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        rewardTabRow: {
          flexDirection: 'row',
          gap: 12,
        },
        rewardTab: {
          flex: 1,
          paddingVertical: 8,
          borderRadius: 12,
          alignItems: 'center',
          backgroundColor: withAlpha(tint, 0.12),
        },
        rewardTabActive: {
          backgroundColor: withAlpha(tint, 0.24),
        },
        rewardCard: {
          padding: 12,
          borderRadius: 14,
          backgroundColor: surface,
          gap: 8,
        },
        rewardInfo: {
          gap: 4,
        },
        rewardLoadingRow: {
          paddingVertical: 12,
          alignItems: 'center',
        },
        rewardProgressRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 12,
          borderRadius: 14,
          backgroundColor: surface,
        },
        rewardProgressInfo: {
          flex: 1,
          gap: 6,
        },
        rewardProgressTrack: {
          height: 10,
          borderRadius: 999,
          backgroundColor: withAlpha(border, 0.3),
          overflow: 'hidden',
        },
        rewardProgressFill: {
          height: '100%',
          borderRadius: 999,
          backgroundColor: tint,
        },
        rewardRedeemButton: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: tint,
        },
        rewardRedeemText: {
          color: background,
        },
        reviewGrid: {
          flexDirection: 'row',
          gap: 12,
          flexWrap: 'wrap',
        },
        reviewTile: {
          width: 90,
          height: 90,
          borderRadius: 16,
          backgroundColor: withAlpha(border, 0.3),
          overflow: 'hidden',
          position: 'relative',
        },
        reviewTileImage: {
          width: '100%',
          height: '100%',
        },
        reviewEmptyTile: {
          width: 180,
          height: 90,
          borderRadius: 16,
          backgroundColor: withAlpha(tint, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
        },
        reviewScore: {
          position: 'absolute',
          bottom: 8,
          right: 8,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        reviewScoreText: {
          color: background,
        },
        favoritesGrid: {
          flexDirection: 'row',
          gap: 12,
          flexWrap: 'wrap',
        },
        favoriteTile: {
          width: 80,
          height: 80,
          borderRadius: 12,
          backgroundColor: withAlpha(border, 0.2),
          overflow: 'hidden',
          position: 'relative',
        },
        favoriteTileImage: {
          width: '100%',
          height: '100%',
        },
        favoriteScore: {
          position: 'absolute',
          bottom: 6,
          right: 6,
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        favoriteScoreText: {
          color: background,
          fontSize: 12,
        },
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        },
        chip: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: border,
        },
        chipSmall: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: border,
        },
        chipActive: {
          backgroundColor: withAlpha(tint, 0.2),
        },
        sliderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        slider: {
          flex: 1,
        },
        dateField: {
          borderWidth: 1,
          borderColor: border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: background,
        },
        dateFieldText: {
          color: text,
        },
        levelCard: {
          padding: 16,
          borderRadius: 18,
          gap: 10,
        },
        levelProgressRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        },
        levelHeart: {
          width: 84,
          height: 84,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        },
        levelHeartValue: {
          position: 'absolute',
          color: tint,
          fontSize: 28,
        },
        levelBarTrack: {
          flex: 1,
          height: 14,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: tint,
          overflow: 'hidden',
        },
        levelBarStack: {
          flex: 1,
          gap: 6,
        },
        levelBarFill: {
          height: '100%',
          borderRadius: 999,
          backgroundColor: tint,
        },
        profileCard: {
          padding: 16,
          borderRadius: 18,
          gap: 12,
          marginRight: CARD_SPACING,
          borderWidth: 1,
          borderColor: border,
          shadowColor: withAlpha(text, 0.3),
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 6,
        },
        sectionRoot: {
          flex: 1,
          justifyContent: 'flex-start',
        },
        sectionCenter: {
          flex: 1,
        },
        sectionCard: {
          position: 'absolute',
          top: 0,
          left: 0,
          borderRadius: 18,
          padding: 16,
          gap: 12,
          borderWidth: 1,
          borderColor: border,
          shadowColor: withAlpha(text, 0.3),
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 1,
          shadowRadius: 16,
          elevation: 8,
          backgroundColor: surface,
        },
        fab: {
          position: 'absolute',
          bottom: 24,
          alignSelf: 'center',
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: withAlpha(text, 0.3),
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 1,
          shadowRadius: 12,
          elevation: 8,
        },
        fabText: {
          color: background,
          fontSize: 26,
        },
        helperText: {
          marginTop: 8,
        },
        sectionStack: {
          gap: 16,
        },
        calendarCard: {
          gap: 12,
        },
        calendarHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        calendarMonthLabel: {
          textTransform: 'capitalize',
        },
        homeRowHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        homeGrid: {
          gap: 16,
        },
        homeRow: {
          flexDirection: 'row',
          gap: 12,
        },
        homeCardHalf: {
          flex: 1,
        },
        homeCard: {
          borderRadius: 20,
          padding: 16,
          gap: 8,
        },
        homeCardWide: {
          width: '100%',
        },
        homeCardDays: {
          backgroundColor: surface,
        },
        homeCardMessage: {
          backgroundColor: surface,
        },
        homeCardDaily: {
          backgroundColor: surface,
        },
        homeCardQuestion: {
          backgroundColor: surface,
        },
        homeCardPhotos: {
          backgroundColor: surface,
        },
        homeCardGoals: {
          backgroundColor: surface,
        },
        homeDailyList: {
          gap: 10,
        },
        homeDailyRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: 12,
          borderRadius: 14,
          backgroundColor: withAlpha(border, 0.12),
        },
        homeDailyInfo: {
          flex: 1,
          gap: 4,
        },
        homeDailyStars: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        homeDailyCheck: {
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tint,
        },
        homeDailyCheckDisabled: {
          backgroundColor: withAlpha(border, 0.3),
        },
        homeDailyMessageList: {
          gap: 10,
        },
        homeCardNews: {
          backgroundColor: surface,
        },
        homeCardHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        novedadesHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        novedadesBadge: {
          minWidth: 24,
          height: 24,
          borderRadius: 12,
          paddingHorizontal: 6,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tint,
        },
        novedadesBadgeText: {
          color: background,
          fontSize: 12,
        },
        homeCardHeaderCenter: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        },
        homeIconCircle: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(tint, 0.12),
        },
        homePhotoTile: {
          width: '100%',
          aspectRatio: 1,
          borderRadius: 16,
          backgroundColor: withAlpha(border, 0.3),
        },
        homePhotoImage: {
          width: '100%',
          aspectRatio: 1,
          borderRadius: 16,
        },
        homePhotoOverlay: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(background, 0.35),
          borderRadius: 16,
        },
        homeMessageRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        },
        homeMessageText: {
          flex: 1,
          gap: 6,
        },
        homeIconButton: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(tint, 0.12),
        },
        homeQuestionText: {
          textAlign: 'center',
        },
        homeAnswersRow: {
          flexDirection: 'row',
          gap: 12,
        },
        homeAnswerCard: {
          flex: 1,
          borderRadius: 14,
          padding: 12,
          backgroundColor: withAlpha(border, 0.15),
          gap: 4,
        },
        homeAnswerButton: {
          alignSelf: 'center',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: border,
        },
        messageList: {
          gap: 12,
        },
        messageRow: {
          gap: 4,
          paddingBottom: 8,
          borderBottomWidth: 1,
          borderBottomColor: border,
        },
        novedadesList: {
          gap: 12,
        },
        novedadesRow: {
          padding: 12,
          borderRadius: 14,
          backgroundColor: withAlpha(border, 0.12),
          gap: 6,
        },
        novedadesMetaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        },
        novedadesSeen: {
          opacity: 0.6,
        },
        daysCount: {
          fontSize: 28,
        },
        photoHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        photoGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
        },
        photoTile: {
          width: '30%',
          aspectRatio: 1,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: withAlpha(border, 0.2),
        },
        photoTileImage: {
          width: '100%',
          height: '100%',
        },
        photoTileLoader: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(text, 0.12),
        },
        challengeList: {
          gap: 12,
        },
        challengeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: border,
          borderRadius: 14,
          padding: 12,
        },
        challengeReviewRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: border,
          borderRadius: 14,
          padding: 12,
          backgroundColor: withAlpha(border, 0.15),
        },
        challengeInfo: {
          gap: 4,
        },
        challengeStars: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        challengeActionButton: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: tint,
        },
        challengeActionText: {
          color: background,
        },
        challengeReviewActions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        challengeApproveButton: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        challengeRejectButton: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: link,
          alignItems: 'center',
          justifyContent: 'center',
        },
        modalBackdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: withAlpha(text, 0.35),
          justifyContent: 'flex-end',
        },
        modalCard: {
          backgroundColor: surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          gap: 12,
          height: '90%',
          width: '100%',
        },
        reviewsModal: {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 20,
          gap: 16,
          backgroundColor: surface,
        },
        tabsRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        },
        tabButton: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: border,
        },
        tabButtonActive: {
          backgroundColor: withAlpha(tint, 0.2),
        },
        reviewList: {
          gap: 12,
        },
        reviewPromptList: {
          gap: 10,
        },
        reviewPromptRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 10,
          borderRadius: 12,
          backgroundColor: withAlpha(border, 0.15),
        },
        reviewPromptThumb: {
          width: 48,
          height: 48,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: withAlpha(border, 0.2),
        },
        reviewPromptInfo: {
          flex: 1,
          gap: 4,
        },
        reviewRow: {
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        },
        reviewDetailHeader: {
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        },
        reviewDetailPhoto: {
          width: 84,
          height: 84,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: withAlpha(border, 0.2),
        },
        reviewDetailPhotoImage: {
          width: '100%',
          height: '100%',
        },
        reviewDetailPhotoPlaceholder: {
          width: '100%',
          height: '100%',
          backgroundColor: withAlpha(border, 0.25),
        },
        reviewDetailInfo: {
          flex: 1,
          gap: 4,
        },
        reviewEntryList: {
          gap: 10,
        },
        reviewEntryCard: {
          padding: 12,
          borderRadius: 14,
          backgroundColor: withAlpha(border, 0.12),
          gap: 6,
        },
        reviewEntryHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        reviewThumb: {
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: withAlpha(border, 0.2),
          overflow: 'hidden',
          position: 'relative',
        },
        imageFill: {
          ...StyleSheet.absoluteFillObject,
        },
        imageLoaderOverlay: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(text, 0.15),
        },
        reviewThumbImage: {
          width: '100%',
          height: '100%',
        },
        reviewInfo: {
          gap: 4,
        },
        photoRow: {
          flexDirection: 'row',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'center',
        },
        photoSlot: {
          width: 54,
          height: 54,
          borderRadius: 10,
          borderWidth: 1,
          overflow: 'hidden',
        },
        photoSlotImage: {
          width: '100%',
          height: '100%',
        },
        tagRow: {
          flexDirection: 'row',
          gap: 8,
          flexWrap: 'wrap',
        },
        favoriteDayRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        favoriteDayMeta: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        favoriteStarButton: {
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: border,
        },
        favoriteStarButtonActive: {
          backgroundColor: withAlpha(tint, 0.2),
          borderColor: tint,
        },
        modalActions: {
          alignItems: 'flex-end',
        },
        modalButtonRow: {
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        },
        modalButtonPrimary: {
          flex: 2,
        },
        modalButtonSecondary: {
          flex: 1,
        },
        modalBackdropCenter: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: withAlpha(text, 0.3),
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        },
        modalCardSmall: {
          width: '100%',
          maxWidth: 420,
          borderRadius: 20,
          padding: 20,
          gap: 12,
          backgroundColor: surface,
        },
        profilePhotoRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        profilePhotoPreview: {
          width: 72,
          height: 72,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: withAlpha(border, 0.2),
        },
        profilePhotoImage: {
          width: '100%',
          height: '100%',
        },
        profilePhotoPlaceholder: {
          width: '100%',
          height: '100%',
          backgroundColor: withAlpha(border, 0.25),
        },
        profilePhotoActions: {
          flex: 1,
          gap: 8,
        },
        modalImagePicker: {
          alignItems: 'center',
          gap: 8,
          alignSelf: 'center',
        },
        modalImagePreview: {
          width: 120,
          height: 120,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: withAlpha(border, 0.2),
        },
        profileAvatarRow: {
          alignItems: 'flex-start',
        },
        profileAvatar: {
          width: 72,
          height: 72,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: withAlpha(border, 0.2),
        },
        socialRow: {
          flexDirection: 'row',
          gap: 10,
          alignItems: 'center',
          marginTop: 6,
        },
        socialIcon: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: withAlpha(tint, 0.12),
        },
        starRow: {
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
        },
        starButton: {
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [background, border, link, surface, text, tint]
  );
};

type ReviewType = {
  key: string;
  label: string;
  sortOrder?: number;
};

type ReviewItem = {
  id: string;
  name: string;
  type: string;
  photoUrl: string | null;
  ratingAvg: number | null;
  reviewText: string | null;
  authorId: string | null;
  createdAt: string | null;
  entries?: {
    authorId: string | null;
    rating: number | null;
    reviewText: string | null;
    createdAt: string | null;
  }[];
};

type RewardItem = {
  id: string;
  title: string;
  description: string | null;
  starsRequired: number;
  createdBy: string | null;
  redeemedAt: string | null;
  redeemedBy: string | null;
  createdAt: string | null;
};

type DailyChallengeItem = {
  id: string;
  title: string;
  stars: number;
  createdBy: string | null;
  completedBy: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

type HomeNotificationItem = {
  ids: string[];
  actorId: string | null;
  actorName: string | null;
  action: string | null;
  count: number;
  text: string | null;
  createdAt: string | null;
  seen: boolean;
};

function ReviewImageBox({
  uri,
  containerStyle,
  imageStyle,
}: {
  uri: string | null;
  containerStyle?: any;
  imageStyle: any;
}) {
  const styles = useFlowStyles();
  const [loading, setLoading] = useState(false);

  return (
    <View style={[styles.imageFill, containerStyle]} pointerEvents="none">
      {uri ? (
        <Image
          source={{ uri }}
          style={imageStyle}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />
      ) : null}
      {loading ? (
        <View style={styles.imageLoaderOverlay}>
          <AnimatedActivityIndicator />
        </View>
      ) : null}
    </View>
  );
}

function AnimatedActivityIndicator() {
  const tint = useThemeColor({}, 'tint');
  return <ActivityIndicator size="small" color={tint} />;
}

async function registerForPushNotificationsAsync() {
  try {
    if (Constants.appOwnership === 'expo') {
      logger.warn('Push notifications require a development build.');
      return null;
    }
    if (!Constants.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenResponse.data;
  } catch (error) {
    logger.error('Push token registration failed', error);
    return null;
  }
}

function PhotoTile({ uri }: { uri: string }) {
  const styles = useFlowStyles();
  const tint = useThemeColor({}, 'tint');
  const [loading, setLoading] = useState(false);

  return (
    <View style={styles.photoTile}>
      <Image
        source={{ uri }}
        style={styles.photoTileImage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading ? (
        <View style={styles.photoTileLoader}>
          <ActivityIndicator size="small" color={tint} />
        </View>
      ) : null}
    </View>
  );
}

const DEFAULT_REVIEW_TYPES: ReviewType[] = [
  { key: 'restoran', label: 'Restoran', sortOrder: 1 },
  { key: 'panorama', label: 'Panorama', sortOrder: 2 },
  { key: 'comida', label: 'Comida', sortOrder: 3 },
  { key: 'juego', label: 'Juego', sortOrder: 4 },
  { key: 'serie', label: 'Serie', sortOrder: 5 },
  { key: 'pelicula', label: 'Pelicula', sortOrder: 6 },
  { key: 'persona', label: 'Persona', sortOrder: 7 },
];

const SOCIAL_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  whatsapp: 'chat',
  instagram: 'photo-camera',
  tiktok: 'music-note',
  linkedin: 'work',
};

const imageMediaType =
  (ImagePicker as { MediaType?: { Images?: string } }).MediaType?.Images ??
  (ImagePicker as { MediaTypeOptions?: { Images?: string } }).MediaTypeOptions?.Images;

export default function FlowScreen() {
  const styles = useFlowStyles();
  const fabIconColor = useThemeColor({}, 'background');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const { height } = useWindowDimensions();
  const { state, updateProfile, updateCouple } = useAuth();
  const { showMessage } = useFlashMessage();
  const listRef = useRef<FlatList>(null);
  const pushTokenRef = useRef<string | null>(null);
  const [verticalScrollEnabled, setVerticalScrollEnabled] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [profileSection, setProfileSection] = useState<'left' | 'center' | 'right'>(
    'center'
  );
  const [reviewAddVisible, setReviewAddVisible] = useState(false);
  const [dateAddVisible, setDateAddVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<
    'dateAdd' | 'coupleStart' | 'coupleMeet' | 'birthday' | null
  >(null);
  const [datePickerSelected, setDatePickerSelected] = useState(new Date());
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [challengeAddVisible, setChallengeAddVisible] = useState(false);
  const [profileEditVisible, setProfileEditVisible] = useState(false);
  const [challengeStars, setChallengeStars] = useState(1);
  const [reviewName, setReviewName] = useState('');
  const [reviewType, setReviewType] = useState('');
  const [reviewRating, setReviewRating] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState('');
  const [reviewPhotoPath, setReviewPhotoPath] = useState('');
  const [reviewUploading, setReviewUploading] = useState(false);
  const [reviewTypes, setReviewTypes] = useState<ReviewType[]>(DEFAULT_REVIEW_TYPES);
  const [dateText, setDateText] = useState('');
  const [dateNote, setDateNote] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [profileAlias, setProfileAlias] = useState(state.profile?.alias ?? '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(state.profile?.photoUrl ?? '');
  const [profilePhotoPath, setProfilePhotoPath] = useState(state.profile?.photoPath ?? '');
  const [profileBirthday, setProfileBirthday] = useState(state.profile?.birthday ?? '');
  const [profileFavoriteFood, setProfileFavoriteFood] = useState(
    state.profile?.favoriteFood ?? ''
  );
  const [profilePersonalityType, setProfilePersonalityType] = useState(
    state.profile?.personalityType ?? ''
  );
  const [profileWhatsappUrl, setProfileWhatsappUrl] = useState(
    state.profile?.whatsappUrl ?? ''
  );
  const [profileInstagramUrl, setProfileInstagramUrl] = useState(
    state.profile?.instagramUrl ?? ''
  );
  const [profileTiktokUrl, setProfileTiktokUrl] = useState(
    state.profile?.tiktokUrl ?? ''
  );
  const [profileLinkedinUrl, setProfileLinkedinUrl] = useState(
    state.profile?.linkedinUrl ?? ''
  );
  const [coupleStartDate, setCoupleStartDate] = useState(
    state.couple?.relationshipStartDate ?? ''
  );
  const [coupleMeetDate, setCoupleMeetDate] = useState(state.couple?.meetDate ?? '');
  const [profileUploading, setProfileUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState({
    home: 0,
    reviews: 0,
    dates: 0,
    profiles: 0,
    goals: 0,
    photos: 0,
  });
  const [initialPhotos, setInitialPhotos] = useState<
    { id: string; url: string; date: string }[]
  >([]);
  const [initialPhotosUserId, setInitialPhotosUserId] = useState<string | null>(
    null
  );
  const [initialPhotosLoaded, setInitialPhotosLoaded] = useState(false);
  const showFab = !['home', 'settings', 'photos'].includes(currentPage);
  const authHeader = useMemo(
    () =>
      state.accessToken
        ? { Authorization: `Bearer ${state.accessToken}` }
        : undefined,
    [state.accessToken]
  );

  useEffect(() => {
    if (!authHeader) return;
    let isActive = true;

    const registerToken = async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token || !isActive) return;
      if (pushTokenRef.current === token) return;

      try {
        const response = await fetch(`${API_URL}/profiles/push-token`, {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          pushTokenRef.current = token;
        }
      } catch (error) {
        logger.error('Push token update failed', error);
      }
    };

    registerToken();

    return () => {
      isActive = false;
    };
  }, [authHeader, state.userId]);

  useEffect(() => {
    if (!authHeader || !state.userId) return;
    if (initialPhotosUserId === state.userId) return;

    const loadInitialPhotos = async () => {
      try {
        const response = await fetch(`${API_URL}/photos?scope=couple&limit=30`, {
          headers: authHeader,
        });
        const data = await response.json();

        if (!response.ok) {
          setInitialPhotos([]);
          setInitialPhotosUserId(state.userId);
          return;
        }

        const items = Array.isArray(data?.items) ? data.items : [];
        const shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, 10);
        setInitialPhotos(
          shuffled.map((item) => ({
            id: item.id,
            url: item.url ?? item.photo_url,
            date: item.date ?? new Date().toISOString().slice(0, 10),
          }))
        );
        setInitialPhotosUserId(state.userId);
      } catch (error) {
        logger.error('Load initial photos failed', error);
        setInitialPhotos([]);
        setInitialPhotosUserId(state.userId);
      } finally {
        setInitialPhotosLoaded(true);
      }
    };

    loadInitialPhotos();
  }, [authHeader, state.userId, initialPhotosUserId]);

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

  const Alert = { alert: showAlert };

  const openDatePicker = (
    target: 'dateAdd' | 'coupleStart' | 'coupleMeet' | 'birthday',
    currentValue: string
  ) => {
    let initialDate = new Date();
    if (currentValue) {
      try {
        const parsed = parseISO(currentValue);
        if (!Number.isNaN(parsed.getTime())) {
          initialDate = parsed;
        }
      } catch {
        initialDate = new Date();
      }
    }

    setDatePickerTarget(target);
    setDatePickerSelected(initialDate);
    setDatePickerMonth(initialDate);
    setDatePickerVisible(true);
  };

  const handleConfirmDatePicker = () => {
    if (!datePickerTarget) return;
    const value = format(datePickerSelected, 'yyyy-MM-dd');

    if (datePickerTarget === 'dateAdd') {
      setDateText(value);
    } else if (datePickerTarget === 'coupleStart') {
      setCoupleStartDate(value);
    } else if (datePickerTarget === 'coupleMeet') {
      setCoupleMeetDate(value);
    } else if (datePickerTarget === 'birthday') {
      setProfileBirthday(value);
    }

    setDatePickerVisible(false);
  };

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    const first = viewableItems[0]?.item?.key;
    if (first) {
      setCurrentPage(first);
    }
  }).current;

  const datePickerMonthLabel = format(datePickerMonth, 'MMMM yyyy', { locale: es });

  const pages = useMemo(
    () => [
      { key: 'home', title: 'Home' },
      { key: 'reviews', title: 'Resenas' },
      { key: 'dates', title: 'Dates' },
      { key: 'profiles', title: 'Perfiles' },
      { key: 'goals', title: 'Goals' },
      { key: 'photos', title: 'Fotos' },
      { key: 'settings', title: 'Settings' },
    ],
    []
  );

  const pageIndexByKey = useMemo(
    () =>
      pages.reduce((acc, page, index) => {
        acc[page.key] = index;
        return acc;
      }, {} as Record<string, number>),
    [pages]
  );

  const handleNavigate = (key: string) => {
    const index = pageIndexByKey[key];
    if (index === undefined) return;
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  useEffect(() => {
    setProfileAlias(state.profile?.alias ?? '');
    setProfilePhotoUrl(state.profile?.photoUrl ?? '');
    setProfilePhotoPath(state.profile?.photoPath ?? '');
    setProfileBirthday(state.profile?.birthday ?? '');
    setProfileFavoriteFood(state.profile?.favoriteFood ?? '');
    setProfilePersonalityType(state.profile?.personalityType ?? '');
    setProfileWhatsappUrl(state.profile?.whatsappUrl ?? '');
    setProfileInstagramUrl(state.profile?.instagramUrl ?? '');
    setProfileTiktokUrl(state.profile?.tiktokUrl ?? '');
    setProfileLinkedinUrl(state.profile?.linkedinUrl ?? '');
  }, [
    state.profile?.alias,
    state.profile?.photoUrl,
    state.profile?.photoPath,
    state.profile?.birthday,
    state.profile?.favoriteFood,
    state.profile?.personalityType,
    state.profile?.whatsappUrl,
    state.profile?.instagramUrl,
    state.profile?.tiktokUrl,
    state.profile?.linkedinUrl,
  ]);

  useEffect(() => {
    setCoupleStartDate(state.couple?.relationshipStartDate ?? '');
    setCoupleMeetDate(state.couple?.meetDate ?? '');
  }, [state.couple?.relationshipStartDate, state.couple?.meetDate]);

  const triggerRefresh = (key: keyof typeof refreshKeys) => {
    setRefreshKeys((prev) => ({
      ...prev,
      [key]: prev[key] + 1,
    }));
  };

  useEffect(() => {
    if (!authHeader) return;

    const loadReviewTypes = async () => {
      try {
        const response = await fetch(`${API_URL}/reviews/types`, {
          headers: authHeader,
        });
        const data = await response.json();

        if (!response.ok) {
          setReviewTypes(DEFAULT_REVIEW_TYPES);
          return;
        }

        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0) {
          setReviewTypes(DEFAULT_REVIEW_TYPES);
          return;
        }

        setReviewTypes(
          items.map((item) => ({
            key: item.key,
            label: item.label,
            sortOrder: item.sort_order ?? 0,
          }))
        );
      } catch (error) {
        logger.error('Fetch review types failed', error);
        setReviewTypes(DEFAULT_REVIEW_TYPES);
      }
    };

    loadReviewTypes();
  }, [authHeader]);

  const handlePickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imageMediaType,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    const previousPhoto = profilePhotoUrl;
    setProfilePhotoUrl(asset.uri);
    setProfileUploading(true);
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
        headers: authHeader,
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data?.error ?? 'No se pudo subir la imagen.');
        setProfilePhotoUrl(previousPhoto);
        return;
      }

      setProfilePhotoPath(data.path ?? '');
      setProfilePhotoUrl(data.signedUrl ?? '');
      if (data.path && state.userId && state.email) {
        const nextProfile = state.profile
          ? { ...state.profile, photoUrl: data.signedUrl ?? null, photoPath: data.path }
          : {
              userId: state.userId,
              email: state.email,
              alias: profileAlias || null,
              coupleId: state.couple?.id ?? null,
              photoUrl: data.signedUrl ?? null,
              photoPath: data.path,
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
            };

        updateProfile(nextProfile);

        if (authHeader) {
          const profileResponse = await fetch(`${API_URL}/profiles/update`, {
            method: 'POST',
            headers: {
              ...authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: state.userId,
              photoUrl: data.path,
            }),
          });
          const profileData = await profileResponse.json();

          if (profileResponse.ok && profileData?.profile) {
            updateProfile({
              userId: profileData.profile.user_id,
              email: profileData.profile.email,
              alias: profileData.profile.alias,
              coupleId: profileData.profile.couple_id,
              photoUrl: profileData.profile.photo_url,
              photoPath: profileData.profile.photo_path ?? null,
              themeLight: profileData.profile.theme_light ?? null,
              themeDark: profileData.profile.theme_dark ?? null,
              termsAcceptedAt: profileData.profile.terms_accepted_at ?? null,
              birthday: profileData.profile.birthday ?? null,
              favoriteFood: profileData.profile.favorite_food ?? null,
              personalityType: profileData.profile.personality_type ?? null,
              whatsappUrl: profileData.profile.whatsapp_url ?? null,
              instagramUrl: profileData.profile.instagram_url ?? null,
              tiktokUrl: profileData.profile.tiktok_url ?? null,
              linkedinUrl: profileData.profile.linkedin_url ?? null,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Upload profile photo failed', error);
      Alert.alert('Error', 'No se pudo subir la imagen.');
      setProfilePhotoUrl(previousPhoto);
    } finally {
      setProfileUploading(false);
    }
  };

  const handlePickReviewPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imageMediaType,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    setReviewPhotoPath('');
    setReviewPhotoUrl(asset.uri);
  };

  const handleSaveProfile = async () => {
    if (!authHeader || !state.userId) return;

    if (profileSection === 'right') {
      Alert.alert('Info', 'Este perfil se edita desde tu pareja.');
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch(
        profileSection === 'center'
          ? `${API_URL}/couples/relationship-start-date`
          : `${API_URL}/profiles/update`,
        {
          method: profileSection === 'center' ? 'PATCH' : 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            profileSection === 'center'
              ? {
                  relationshipStartDate: coupleStartDate,
                  meetDate: coupleMeetDate,
                }
              : {
                  userId: state.userId,
                  alias: profileAlias,
                  photoUrl: profilePhotoPath || state.profile?.photoPath || null,
                  birthday: profileBirthday,
                  favoriteFood: profileFavoriteFood,
                  personalityType: profilePersonalityType,
                  whatsappUrl: profileWhatsappUrl,
                  instagramUrl: profileInstagramUrl,
                  tiktokUrl: profileTiktokUrl,
                  linkedinUrl: profileLinkedinUrl,
                }
          ),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data?.error ?? 'No se pudo guardar el perfil.');
        return;
      }

      if (profileSection === 'center' && data?.couple) {
        updateCouple({
          id: data.couple.id,
          code: data.couple.code,
          memberCount: data.couple.member_count,
          relationshipStartDate: data.couple.relationship_start_date ?? null,
          meetDate: data.couple.meet_date ?? null,
        });
      }

      if (profileSection !== 'center' && data?.profile) {
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

      Alert.alert('Listo', 'Perfil actualizado.');
      if (currentPage === 'profiles') {
        triggerRefresh('profiles');
      }
      setProfileEditVisible(false);
    } catch (error) {
      logger.error('Save profile failed', error);
      Alert.alert('Error', 'No se pudo guardar el perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveReview = async () => {
    if (!authHeader) return;
    if (!reviewName.trim() || !reviewType.trim() || reviewRating === null) {
      Alert.alert('Error', 'Completa nombre, tipo y nota.');
      return;
    }

    const reviewText = reviewNote.trim() || null;

    try {
      const response = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: reviewName.trim(),
          type: reviewType.trim(),
          photoUrl: reviewPhotoPath || null,
          rating: reviewRating,
          reviewText,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data?.error ?? 'No se pudo guardar la resena.');
        return;
      }

      const reviewId = data?.review?.id;
      if (reviewId && reviewPhotoUrl && !reviewPhotoPath && !reviewPhotoUrl.startsWith('http')) {
        setReviewUploading(true);
        try {
          const formData = new FormData();
          formData.append('image', {
            uri: reviewPhotoUrl,
            name: 'review.jpg',
            type: 'image/jpeg',
          } as unknown as Blob);
          formData.append('scope', 'couple');
          formData.append('model', 'review');
          formData.append('modelId', reviewId);
          formData.append('date', new Date().toISOString().slice(0, 10));

          const uploadResponse = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: authHeader,
            body: formData,
          });
          const uploadData = await uploadResponse.json();

          if (uploadResponse.ok && uploadData?.path) {
            await fetch(`${API_URL}/reviews/${reviewId}/photo`, {
              method: 'PATCH',
              headers: {
                ...authHeader,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ photoUrl: uploadData.path }),
            });
          }
        } finally {
          setReviewUploading(false);
        }
      }

      setReviewAddVisible(false);
      setReviewName('');
      setReviewType('');
      setReviewRating(null);
      setReviewNote('');
      setReviewPhotoUrl('');
      setReviewPhotoPath('');
      Alert.alert('Listo', 'Resena guardada.');
      if (currentPage === 'reviews') {
        triggerRefresh('reviews');
      }
    } catch (error) {
      logger.error('Save review failed', error);
      Alert.alert('Error', 'No se pudo guardar la resena.');
    }
  };

  const handleSaveDate = async () => {
    if (!authHeader || !dateText.trim()) {
      Alert.alert('Error', 'Ingresa una fecha.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/calendar/day`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayDate: dateText.trim(),
          noteText: dateNote.trim() || null,
          ownerType: 'couple',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data?.error ?? 'No se pudo guardar la fecha.');
        return;
      }

      setDateAddVisible(false);
      setDateText('');
      setDateNote('');
      if (currentPage === 'dates') {
        triggerRefresh('dates');
      }
    } catch (error) {
      logger.error('Save date failed', error);
      Alert.alert('Error', 'No se pudo guardar la fecha.');
    }
  };

  const handleSaveChallenge = async () => {
    if (!authHeader || !challengeTitle.trim()) {
      Alert.alert('Error', 'Ingresa un titulo.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/home/challenges`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: challengeTitle.trim(),
          description: challengeDescription.trim() || null,
          stars: challengeStars,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data?.error ?? 'No se pudo guardar el reto.');
        return;
      }

      setChallengeAddVisible(false);
      setChallengeTitle('');
      setChallengeDescription('');
      setChallengeStars(1);
      Alert.alert('Listo', 'Reto creado.');
      if (currentPage === 'goals') {
        triggerRefresh('goals');
      }
    } catch (error) {
      logger.error('Save challenge failed', error);
      Alert.alert('Error', 'No se pudo guardar el reto.');
    }
  };

  return (
    <View style={styles.flowRoot}>
      <FlatList
        ref={listRef}
        data={pages}
        keyExtractor={(item) => item.key}
        pagingEnabled
        scrollEnabled={verticalScrollEnabled}
        showsVerticalScrollIndicator={false}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item }) => (
          <View style={[styles.page, { height }]}>
            {item.key === 'home' && (
              <HomePage
                onNavigate={handleNavigate}
                setVerticalScrollEnabled={setVerticalScrollEnabled}
              />
            )}
            {item.key === 'reviews' && (
              <ReviewsPage
                setVerticalScrollEnabled={setVerticalScrollEnabled}
                reviewTypes={reviewTypes}
                refreshKey={refreshKeys.reviews}
              />
            )}
            {item.key === 'dates' && (
              <DatesPage
                setVerticalScrollEnabled={setVerticalScrollEnabled}
                refreshKey={refreshKeys.dates}
              />
            )}
            {item.key === 'profiles' && (
              <ProfilesPage
                setVerticalScrollEnabled={setVerticalScrollEnabled}
                onSectionChange={setProfileSection}
                refreshKey={refreshKeys.profiles}
              />
            )}
            {item.key === 'goals' && (
              <GoalsPage />
            )}
            {item.key === 'photos' && (
              <PhotosPage
                refreshKey={refreshKeys.photos}
                initialPhotos={initialPhotos}
                initialPhotosLoaded={initialPhotosLoaded}
              />
            )}
            {item.key === 'settings' && (
              <SettingsPage />
            )}
          </View>
        )}
      />
      {showFab ? (
        <Pressable
          style={styles.fab}
          onPress={() => {
            if (currentPage === 'reviews') {
              setReviewAddVisible(true);
              setReviewType(reviewTypes[0]?.key ?? '');
              setReviewRating(null);
              return;
            }
            if (currentPage === 'dates') {
              setDateAddVisible(true);
              return;
            }
            if (currentPage === 'goals') {
              setChallengeAddVisible(true);
              return;
            }
            if (currentPage === 'profiles') {
              setProfileEditVisible(true);
            }
          }}>
          {currentPage === 'profiles' ? (
            <IconSymbol name="pencil" size={22} color={fabIconColor} />
          ) : (
            <ThemedText type="defaultSemiBold" style={styles.fabText}>
              +
            </ThemedText>
          )}
        </Pressable>
      ) : null}
      <Modal
        animationType="slide"
        transparent
        visible={reviewAddVisible}
        onRequestClose={() => setReviewAddVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReviewAddVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Agregar resena</ThemedText>
            <Pressable
              style={styles.modalImagePicker}
              onPress={handlePickReviewPhoto}
              disabled={reviewUploading}>
              <View style={styles.modalImagePreview}>
                {reviewPhotoUrl ? (
                  <Image source={{ uri: reviewPhotoUrl }} style={styles.profilePhotoImage} />
                ) : (
                  <View style={styles.profilePhotoPlaceholder} />
                )}
              </View>
              <ThemedText type="default">Toca para subir foto</ThemedText>
            </Pressable>
            <Input placeholder="Nombre" value={reviewName} onChangeText={setReviewName} />
            <ThemedText type="defaultSemiBold">Tipo</ThemedText>
            <View style={styles.chipRow}>
              {reviewTypes.map((type) => (
                <Pressable
                  key={type.key}
                  onPress={() => setReviewType(type.key)}
                  style={[
                    styles.chip,
                    reviewType === type.key && styles.chipActive,
                  ]}>
                  <ThemedText type="defaultSemiBold">{type.label}</ThemedText>
                </Pressable>
              ))}
            </View>
            <ThemedText type="defaultSemiBold">Nota</ThemedText>
            <View style={styles.sliderRow}>
              <Slider
                value={reviewRating ?? 0}
                minimumValue={0}
                maximumValue={10}
                step={0.1}
                minimumTrackTintColor={tint}
                maximumTrackTintColor={border}
                thumbTintColor={text}
                onValueChange={(value) => setReviewRating(value)}
                style={styles.slider}
              />
              <ThemedText type="defaultSemiBold">
                {(reviewRating ?? 0).toFixed(1)}
              </ThemedText>
            </View>
            <Input placeholder="Comentario" value={reviewNote} onChangeText={setReviewNote} />
            <Button
              label={
                reviewUploading
                  ? 'Subiendo...'
                  : reviewPhotoUrl
                    ? 'Foto lista (OK)'
                    : 'Subir foto'
              }
              variant="secondary"
              onPress={handlePickReviewPhoto}
              loading={reviewUploading}
            />
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button
                  label="Guardar"
                  variant="primary"
                  onPress={handleSaveReview}
                  disabled={reviewUploading}
                />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cancelar" variant="muted" onPress={() => setReviewAddVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={dateAddVisible}
        onRequestClose={() => setDateAddVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDateAddVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Agregar fecha</ThemedText>
            <Input
              placeholder="Fecha"
              value={dateText}
              editable={false}
              onPressIn={() => openDatePicker('dateAdd', dateText)}
            />
            <Input placeholder="Texto" value={dateNote} onChangeText={setDateNote} />
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button label="Guardar" variant="primary" onPress={handleSaveDate} />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cancelar" variant="muted" onPress={() => setDateAddVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={challengeAddVisible}
        onRequestClose={() => setChallengeAddVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setChallengeAddVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Agregar reto</ThemedText>
            <Input placeholder="Titulo" value={challengeTitle} onChangeText={setChallengeTitle} />
            <Input
              placeholder="Descripcion"
              value={challengeDescription}
              onChangeText={setChallengeDescription}
            />
            <View style={styles.starRow}>
              {Array.from({ length: 5 }).map((_, index) => {
                const starValue = index + 1;
                const filled = starValue <= challengeStars;
                return (
                  <Pressable
                    key={`star-${starValue}`}
                    style={styles.starButton}
                    onPress={() => setChallengeStars(starValue)}>
                    <IconSymbol
                      name={filled ? 'star.fill' : 'star'}
                      size={26}
                      color={filled ? tint : withAlpha(tint, 0.4)}
                    />
                  </Pressable>
                );
              })}
              <ThemedText type="defaultSemiBold">{challengeStars} estrellas</ThemedText>
            </View>
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button label="Guardar" variant="primary" onPress={handleSaveChallenge} />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cancelar" variant="muted" onPress={() => setChallengeAddVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={profileEditVisible}
        onRequestClose={() => setProfileEditVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setProfileEditVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Editar perfil</ThemedText>
            <ThemedText>
              Seccion activa: {profileSection === 'center' ? 'Pareja' : profileSection}
            </ThemedText>
            {profileSection === 'center' ? (
              <>
                <Input
                  placeholder="Dia de inicio"
                  value={coupleStartDate}
                  editable={false}
                  onPressIn={() => openDatePicker('coupleStart', coupleStartDate)}
                />
                <Input
                  placeholder="Dia de conocernos"
                  value={coupleMeetDate}
                  editable={false}
                  onPressIn={() => openDatePicker('coupleMeet', coupleMeetDate)}
                />
              </>
            ) : profileSection === 'right' ? (
              <ThemedText>Este perfil solo se edita por tu pareja.</ThemedText>
            ) : (
              <>
                <Pressable
                  style={styles.modalImagePicker}
                  onPress={handlePickProfilePhoto}
                  disabled={profileUploading}>
                  <View style={styles.modalImagePreview}>
                    {profilePhotoUrl ? (
                      <Image
                        source={{ uri: profilePhotoUrl }}
                        style={styles.profilePhotoImage}
                      />
                    ) : (
                      <View style={styles.profilePhotoPlaceholder} />
                    )}
                  </View>
                  <ThemedText type="default">Toca para subir foto</ThemedText>
                </Pressable>
                <Input placeholder="Alias" value={profileAlias} onChangeText={setProfileAlias} />
                <Input
                  placeholder="Cumpleanos"
                  value={profileBirthday}
                  editable={false}
                  onPressIn={() => openDatePicker('birthday', profileBirthday)}
                />
                <Input
                  placeholder="Comida favorita"
                  value={profileFavoriteFood}
                  onChangeText={setProfileFavoriteFood}
                />
                <Input
                  placeholder="Tipo de personalidad"
                  value={profilePersonalityType}
                  onChangeText={setProfilePersonalityType}
                />
                <Input
                  placeholder="WhatsApp"
                  value={profileWhatsappUrl}
                  onChangeText={setProfileWhatsappUrl}
                />
                <Input
                  placeholder="Instagram"
                  value={profileInstagramUrl}
                  onChangeText={setProfileInstagramUrl}
                />
                <Input
                  placeholder="TikTok"
                  value={profileTiktokUrl}
                  onChangeText={setProfileTiktokUrl}
                />
                <Input
                  placeholder="LinkedIn"
                  value={profileLinkedinUrl}
                  onChangeText={setProfileLinkedinUrl}
                />
                <Button
                  label={
                    profileUploading
                      ? 'Subiendo...'
                      : profilePhotoPath
                        ? 'Foto lista (OK)'
                        : 'Subir foto'
                  }
                  variant="secondary"
                  onPress={handlePickProfilePhoto}
                  loading={profileUploading}
                />
              </>
            )}
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button
                  label={savingProfile ? 'Guardando...' : 'Guardar'}
                  variant="primary"
                  onPress={handleSaveProfile}
                  disabled={savingProfile || profileUploading || profileSection === 'right'}
                />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cancelar" variant="muted" onPress={() => setProfileEditVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={datePickerVisible}
        onRequestClose={() => setDatePickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDatePickerVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Selecciona una fecha</ThemedText>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => setDatePickerMonth((current) => subMonths(current, 1))}>
                <ThemedText type="defaultSemiBold">Anterior</ThemedText>
              </Pressable>
              <ThemedText type="defaultSemiBold" style={styles.calendarMonthLabel}>
                {datePickerMonthLabel}
              </ThemedText>
              <Pressable onPress={() => setDatePickerMonth((current) => addMonths(current, 1))}>
                <ThemedText type="defaultSemiBold">Siguiente</ThemedText>
              </Pressable>
            </View>
            <Calendar
              monthDate={datePickerMonth}
              selectedDate={datePickerSelected}
              onSelectDate={(date) => {
                setDatePickerSelected(date);
                setDatePickerMonth(date);
              }}
            />
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button label="Guardar" variant="primary" onPress={handleConfirmDatePicker} />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cancelar" variant="muted" onPress={() => setDatePickerVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function HomePage({
  onNavigate,
  setVerticalScrollEnabled,
}: {
  onNavigate: (key: string) => void;
  setVerticalScrollEnabled: (enabled: boolean) => void;
}) {
  const styles = useFlowStyles();
  const iconColor = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const { state } = useAuth();
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageListVisible, setMessageListVisible] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [novedadesVisible, setNovedadesVisible] = useState(false);
  const novedadesAutoOpenRef = useRef(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [answerDraft, setAnswerDraft] = useState('');
  const [dailyMessage, setDailyMessage] = useState('Sin mensajes aun.');
  const [dailyQuestion, setDailyQuestion] = useState('No hay pregunta hoy.');
  const [answers, setAnswers] = useState<
    { id: string; name: string; text: string | null }[]
  >([
    { id: 'a-1', name: 'Tu', text: null },
    { id: 'a-2', name: 'Pareja', text: null },
  ]);
  const [messageHistory, setMessageHistory] = useState<
    { id: string; author: string; text: string; createdAt: string }[]
  >([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingNovedades, setLoadingNovedades] = useState(false);
  const [novedadesItems, setNovedadesItems] = useState<HomeNotificationItem[]>([]);
  const [novedadesLoaded, setNovedadesLoaded] = useState(false);
  const [homeChallenges, setHomeChallenges] = useState<
    { id: string; title: string; status: string; stars: number }[]
  >([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallengeItem[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyActionId, setDailyActionId] = useState<string | null>(null);
  const [homePhotoUrl, setHomePhotoUrl] = useState<string | null>(null);
  const [homePhotoLoading, setHomePhotoLoading] = useState(false);

  const relationshipStartDate = useMemo(() => {
    if (!state.couple?.relationshipStartDate) return null;
    try {
      return parseISO(state.couple.relationshipStartDate);
    } catch {
      return null;
    }
  }, [state.couple?.relationshipStartDate]);

  const daysTogether = relationshipStartDate
    ? Math.max(0, differenceInCalendarDays(new Date(), relationshipStartDate))
    : 0;
  const relationshipDateLabel = relationshipStartDate
    ? format(relationshipStartDate, "d 'de' MMMM yyyy", { locale: es })
    : 'Sin fecha';

  const hasPendingAnswer = answers.some((answer) => !answer.text);

  const authHeader = useMemo(
    () =>
      state.accessToken
        ? { Authorization: `Bearer ${state.accessToken}` }
        : undefined,
    [state.accessToken]
  );

  const fetchDailyMessage = async () => {
    if (!authHeader) return;

    try {
      const response = await fetch(`${API_URL}/home/daily-message`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setDailyMessage('Sin mensajes aun.');
        return;
      }

      setDailyMessage(data?.message?.text ?? 'Sin mensajes aun.');
    } catch (error) {
      logger.error('Fetch daily message failed', error);
      setDailyMessage('Sin mensajes aun.');
    }
  };

  const fetchDailyQuestion = async () => {
    if (!authHeader) return;

    setLoadingQuestion(true);
    try {
      const response = await fetch(`${API_URL}/home/daily-question`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setDailyQuestion('No hay pregunta hoy.');
        return;
      }

      setDailyQuestion(data?.question?.question ?? 'No hay pregunta hoy.');
    } catch (error) {
      logger.error('Fetch daily question failed', error);
      setDailyQuestion('No hay pregunta hoy.');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const fetchDailyAnswers = async () => {
    if (!authHeader) return;

    try {
      const response = await fetch(`${API_URL}/home/daily-question/answers`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setAnswers([
          { id: 'a-1', name: 'Tu', text: null },
          { id: 'a-2', name: 'Pareja', text: null },
        ]);
        return;
      }

      const apiAnswers = Array.isArray(data?.answers) ? data.answers : [];
      setAnswers([
        { id: 'a-1', name: 'Tu', text: apiAnswers[0]?.answer_text ?? null },
        { id: 'a-2', name: 'Pareja', text: apiAnswers[1]?.answer_text ?? null },
      ]);
    } catch (error) {
      logger.error('Fetch daily answers failed', error);
      setAnswers([
        { id: 'a-1', name: 'Tu', text: null },
        { id: 'a-2', name: 'Pareja', text: null },
      ]);
    }
  };

  const fetchMessages = async () => {
    if (!authHeader) return;

    setLoadingMessages(true);
    try {
      const response = await fetch(`${API_URL}/home/messages`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setMessageHistory([]);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setMessageHistory(
        items.map((item) => ({
          id: item.id,
          author: item.author_id === state.userId ? 'Tu' : 'Pareja',
          text: item.text,
          createdAt: item.created_at,
        }))
      );
    } catch (error) {
      logger.error('Fetch messages failed', error);
      setMessageHistory([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const fetchNovedades = async () => {
    if (!authHeader) return;
    setLoadingNovedades(true);
    try {
      const response = await fetch(`${API_URL}/home/notifications`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setNovedadesItems([]);
        setNovedadesLoaded(true);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setNovedadesItems(
        items.map((item) => ({
          ids: Array.isArray(item.ids) ? item.ids : [],
          actorId: item.actor_id ?? null,
          actorName: item.actor_name ?? null,
          action: item.action ?? null,
          count: Number(item.count ?? 0),
          text: item.text ?? null,
          createdAt: item.created_at ?? null,
          seen: Boolean(item.seen),
        }))
      );
    } catch (error) {
      logger.error('Fetch novedades failed', error);
      setNovedadesItems([]);
    } finally {
      setLoadingNovedades(false);
      setNovedadesLoaded(true);
    }
  };

  const formatNovedadTime = (value: string | null) => {
    if (!value) return '';
    try {
      return format(new Date(value), 'd MMM, HH:mm', { locale: es });
    } catch {
      return '';
    }
  };

  const markNovedadesSeen = async () => {
    if (!authHeader) {
      return false;
    }

    const unseenIds = novedadesItems
      .filter((item) => !item.seen)
      .flatMap((item) => item.ids);
    if (unseenIds.length === 0) {
      return true;
    }

    try {
      await fetch(`${API_URL}/home/notifications/seen`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: unseenIds }),
      });
    } catch (error) {
      logger.error('Mark novedades seen failed', error);
    } finally {
      setNovedadesItems((prev) => prev.map((item) => ({ ...item, seen: true })));
      return true;
    }
  };

  const handleMarkNovedadesSeen = async () => {
    await markNovedadesSeen();
    setNovedadesVisible(false);
  };

  const handleOpenNovedad = async () => {
    await markNovedadesSeen();
    setNovedadesVisible(false);
    onNavigate('goals');
  };

  const fetchRandomCouplePhoto = async () => {
    if (!authHeader) return;
    setHomePhotoLoading(true);
    try {
      const response = await fetch(`${API_URL}/photos?scope=couple&limit=24`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setHomePhotoUrl(null);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      if (items.length === 0) {
        setHomePhotoUrl(null);
        return;
      }

      const randomItem = items[Math.floor(Math.random() * items.length)];
      setHomePhotoUrl(randomItem?.url ?? randomItem?.photo_url ?? null);
    } catch (error) {
      logger.error('Fetch home photo failed', error);
      setHomePhotoUrl(null);
    } finally {
      setHomePhotoLoading(false);
    }
  };

  const fetchChallenges = async () => {
    if (!authHeader) return;
    setLoadingChallenges(true);
    try {
      const response = await fetch(`${API_URL}/home/challenges`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setHomeChallenges([]);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setHomeChallenges(
        items.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          stars: Number(item.stars ?? 0),
        }))
      );
    } catch (error) {
      logger.error('Fetch challenges failed', error);
      setHomeChallenges([]);
    } finally {
      setLoadingChallenges(false);
    }
  };

  const fetchDailyChallenges = async () => {
    if (!authHeader) return;
    setDailyLoading(true);
    try {
      const response = await fetch(`${API_URL}/home/daily-challenges`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setDailyChallenges([]);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setDailyChallenges(
        items.map((item) => ({
          id: item.id,
          title: item.title,
          stars: Number(item.stars ?? 0),
          createdBy: item.created_by ?? null,
          completedBy: item.completed_by ?? null,
          completedAt: item.completed_at ?? null,
          createdAt: item.created_at ?? null,
        }))
      );
    } catch (error) {
      logger.error('Fetch daily challenges failed', error);
      setDailyChallenges([]);
    } finally {
      setDailyLoading(false);
    }
  };

  const handleCompleteDaily = async (id: string) => {
    if (!authHeader || dailyActionId) return;
    setDailyActionId(id);
    try {
      const response = await fetch(`${API_URL}/home/daily-challenges/${id}/complete`, {
        method: 'POST',
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        logger.warn('Complete daily challenge failed', { error: data?.error });
        return;
      }

      setDailyChallenges((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                completedBy: data.challenge?.completed_by ?? state.userId,
                completedAt: data.challenge?.completed_at ?? new Date().toISOString(),
              }
            : item
        )
      );
    } catch (error) {
      logger.error('Complete daily challenge failed', error);
    } finally {
      setDailyActionId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!authHeader || !messageDraft.trim()) return;

    try {
      const response = await fetch(`${API_URL}/home/messages`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: messageDraft.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        logger.warn('Send message failed', { error: data?.error });
        return;
      }

      setMessageDraft('');
      await fetchMessages();
      await fetchNovedades();
    } catch (error) {
      logger.error('Send message failed', error);
    }
  };

  const handleSendAnswer = async () => {
    if (!authHeader || !answerDraft.trim()) return;

    try {
      const response = await fetch(`${API_URL}/home/daily-question/answer`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answerText: answerDraft.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        logger.warn('Send answer failed', { error: data?.error });
        return;
      }

      setAnswerDraft('');
      await fetchDailyAnswers();
      await fetchNovedades();
    } catch (error) {
      logger.error('Send answer failed', error);
    }
  };

  useEffect(() => {
    if (!authHeader) return;

    const loadHome = async () => {
      await fetchDailyMessage();
      await fetchDailyQuestion();
      await fetchDailyAnswers();
      await fetchMessages();
      await fetchNovedades();
      await fetchChallenges();
      await fetchDailyChallenges();
      await fetchRandomCouplePhoto();
    };

    loadHome();
  }, [authHeader, state.couple?.relationshipStartDate]);

  useEffect(() => {
    novedadesAutoOpenRef.current = false;
    setNovedadesLoaded(false);
  }, [authHeader]);

  useEffect(() => {
    if (!novedadesLoaded) return;
    if (novedadesVisible) return;

    const hasUnseen = novedadesItems.some((item) => !item.seen);
    if (hasUnseen && !novedadesAutoOpenRef.current) {
      setNovedadesVisible(true);
      novedadesAutoOpenRef.current = true;
    }
  }, [novedadesLoaded, novedadesItems, novedadesVisible]);

  const spotlightChallenge = homeChallenges.find(
    (challenge) => challenge.status === 'accepted'
  );

  const visibleDailyChallenges = dailyChallenges.filter(
    (item) => item.createdBy !== state.userId
  );
  const dailyCompleted = visibleDailyChallenges.filter((item) => item.completedAt);

  return (
    <ThemedView style={styles.container}>
      <SectionFlow
        center={
          <View style={styles.homeGrid}>
            <View style={styles.homeRow}>
              <View style={[styles.homeCard, styles.homeCardHalf, styles.homeCardDays]}>
                <View style={styles.homeCardHeader}>
                  <View style={styles.homeIconCircle}>
                    <IconSymbol name="calendar" size={20} color={iconColor} />
                  </View>
                  <ThemedText type="defaultSemiBold">Dias juntos</ThemedText>
                </View>
                <ThemedText style={styles.daysCount}>{daysTogether} dias</ThemedText>
                <ThemedText>Desde {relationshipDateLabel}</ThemedText>
              </View>
              <Pressable
                style={[styles.homeCard, styles.homeCardHalf, styles.homeCardPhotos]}
                onPress={() => onNavigate('photos')}>
                <View style={styles.homeCardHeader}>
                  <View style={styles.homeIconCircle}>
                    <IconSymbol name="photo.on.rectangle" size={20} color={iconColor} />
                  </View>
                  <ThemedText type="defaultSemiBold">Foto</ThemedText>
                </View>
                {homePhotoUrl ? (
                  <Image source={{ uri: homePhotoUrl }} style={styles.homePhotoImage} />
                ) : (
                  <View style={styles.homePhotoTile} />
                )}
                {homePhotoLoading ? (
                  <View style={styles.homePhotoOverlay}>
                    <ActivityIndicator size="small" color={iconColor} />
                  </View>
                ) : null}
              </Pressable>
            </View>

            <View style={[styles.homeCard, styles.homeCardMessage]}>
              <View style={styles.homeMessageRow}>
                <View style={styles.homeMessageText}>
                  <View style={styles.homeCardHeader}>
                    <View style={styles.homeIconCircle}>
                      <IconSymbol name="message.fill" size={20} color={iconColor} />
                    </View>
                    <ThemedText type="defaultSemiBold">Mensajes</ThemedText>
                  </View>
                  <ThemedText>Mensaje del dia: {dailyMessage}</ThemedText>
                </View>
                <Pressable
                  style={styles.homeIconButton}
                  onPress={() => setMessageModalVisible(true)}>
                  <IconSymbol name="paperplane.fill" size={18} color={iconColor} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.homeCard, styles.homeCardQuestion]}>
              <View style={styles.homeCardHeaderCenter}>
                <View style={styles.homeIconCircle}>
                  <IconSymbol name="questionmark.circle.fill" size={20} color={iconColor} />
                </View>
                <ThemedText type="defaultSemiBold">Pregunta diaria</ThemedText>
              </View>
              <ThemedText style={styles.homeQuestionText}>
                {loadingQuestion ? 'Cargando...' : dailyQuestion}
              </ThemedText>
              <View style={styles.homeAnswersRow}>
                {answers.map((answer) => (
                  <View key={answer.id} style={styles.homeAnswerCard}>
                    <ThemedText type="defaultSemiBold">{answer.name}</ThemedText>
                    <ThemedText>{answer.text ?? 'No ha contestado'}</ThemedText>
                  </View>
                ))}
              </View>
              {hasPendingAnswer ? (
                <Pressable
                  style={styles.homeAnswerButton}
                  onPress={() => setQuestionModalVisible(true)}>
                  <ThemedText type="defaultSemiBold">Responder</ThemedText>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              style={[styles.homeCard, styles.homeCardGoals]}
              onPress={() => onNavigate('goals')}>
              <View style={styles.homeCardHeader}>
                <View style={styles.homeIconCircle}>
                  <IconSymbol name="star.fill" size={20} color={iconColor} />
                </View>
                <ThemedText type="defaultSemiBold">Retos</ThemedText>
              </View>
              {loadingChallenges ? (
                <ThemedText>Cargando retos...</ThemedText>
              ) : spotlightChallenge ? (
                <>
                  <ThemedText type="defaultSemiBold">{spotlightChallenge.title}</ThemedText>
                  <ThemedText>{spotlightChallenge.stars} estrellas</ThemedText>
                </>
              ) : (
                <ThemedText>Retos actuales pendientes.</ThemedText>
              )}
            </Pressable>
          </View>
        }
        left={
          <>
            <ThemedText type="subtitle">Retos diarios</ThemedText>
            {dailyLoading ? <ThemedText>Cargando...</ThemedText> : null}
            {!dailyLoading && visibleDailyChallenges.length === 0 ? (
              <ThemedText>Sin retos diarios hoy.</ThemedText>
            ) : (
              <View style={styles.homeDailyList}>
                {visibleDailyChallenges.map((item) => {
                  const completed = Boolean(item.completedAt);
                  return (
                    <View key={item.id} style={styles.homeDailyRow}>
                      <View style={styles.homeDailyInfo}>
                        <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                        <View style={styles.homeDailyStars}>
                          <IconSymbol name="star.fill" size={16} color={tint} />
                          <ThemedText type="defaultSemiBold">{item.stars}</ThemedText>
                        </View>
                      </View>
                      <Pressable
                        style={[
                          styles.homeDailyCheck,
                          (completed || dailyActionId === item.id) &&
                            styles.homeDailyCheckDisabled,
                        ]}
                        onPress={() => handleCompleteDaily(item.id)}
                        disabled={completed || dailyActionId === item.id}>
                        <IconSymbol name="checkmark" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
            {visibleDailyChallenges.length > 0 ? (
              <ThemedText>
                Completados: {dailyCompleted.length}/{visibleDailyChallenges.length}
              </ThemedText>
            ) : null}
          </>
        }
        right={
          <>
            <ThemedText type="subtitle">Mensajes</ThemedText>
            <View style={styles.homeDailyMessageList}>
              {loadingMessages ? <ThemedText>Cargando...</ThemedText> : null}
              {!loadingMessages && messageHistory.length === 0 ? (
                <ThemedText>No hay mensajes aun.</ThemedText>
              ) : (
                messageHistory.map((message) => (
                  <View key={message.id} style={styles.messageRow}>
                    <ThemedText type="defaultSemiBold">{message.author}</ThemedText>
                    <ThemedText>{message.text}</ThemedText>
                  </View>
                ))
              )}
            </View>
          </>
        }
        minHeight={260}
        onHorizontalScrollActive={(active) => setVerticalScrollEnabled(!active)}
      />

      <Modal
        animationType="fade"
        transparent
        visible={novedadesVisible}
        onRequestClose={() => setNovedadesVisible(false)}>
        <Pressable
          style={styles.modalBackdropCenter}
          onPress={() => setNovedadesVisible(false)}>
          <Pressable style={styles.modalCardSmall} onPress={() => {}}>
            <ThemedText type="subtitle">Novedades</ThemedText>
            <View style={styles.novedadesList}>
              {loadingNovedades ? <ThemedText>Cargando...</ThemedText> : null}
              {!loadingNovedades && novedadesItems.length === 0 ? (
                <ThemedText>Sin novedades aun.</ThemedText>
              ) : null}
              {novedadesItems.map((item) => {
                const timeLabel = formatNovedadTime(item.createdAt);
                return (
                  <Pressable
                    key={item.ids[0] ?? `${item.action}-${item.actorId}-${item.createdAt}`}
                    style={[styles.novedadesRow, item.seen && styles.novedadesSeen]}
                    onPress={handleOpenNovedad}>
                    <View style={styles.novedadesMetaRow}>
                      {timeLabel ? <ThemedText>{timeLabel}</ThemedText> : null}
                    </View>
                    <ThemedText>{item.text ?? 'Nueva novedad.'}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button label="OK" variant="primary" onPress={handleMarkNovedadesSeen} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={messageListVisible}
        onRequestClose={() => setMessageListVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMessageListVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Mensajes enviados</ThemedText>
            <ThemedText>Ver mensajes en la seccion derecha.</ThemedText>
            <Pressable onPress={() => setMessageListVisible(false)}>
              <ThemedText type="link">Cerrar</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={messageModalVisible}
        onRequestClose={() => setMessageModalVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMessageModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Nuevo mensaje</ThemedText>
            <Input
              placeholder="Escribe algo bonito..."
              value={messageDraft}
              onChangeText={setMessageDraft}
            />
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button label="Guardar" variant="primary" onPress={handleSendMessage} />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button
                  label="Cancelar"
                  variant="muted"
                  onPress={() => setMessageModalVisible(false)}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={questionModalVisible}
        onRequestClose={() => setQuestionModalVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setQuestionModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Tu respuesta</ThemedText>
            <ThemedText>{dailyQuestion}</ThemedText>
            <Input
              placeholder="Responde aqui..."
              value={answerDraft}
              onChangeText={setAnswerDraft}
            />
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button label="Guardar" variant="primary" onPress={handleSendAnswer} />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button
                  label="Cancelar"
                  variant="muted"
                  onPress={() => setQuestionModalVisible(false)}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function ReviewsPage({
  setVerticalScrollEnabled,
  reviewTypes,
  refreshKey,
}: {
  setVerticalScrollEnabled: (enabled: boolean) => void;
  reviewTypes: ReviewType[];
  refreshKey: number;
}) {
  const styles = useFlowStyles();
  const { state } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(reviewTypes[0]?.key ?? '');
  const [allItems, setAllItems] = useState<ReviewItem[]>([]);
  const [modalItems, setModalItems] = useState<ReviewItem[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [replyVisible, setReplyVisible] = useState(false);
  const [replyRating, setReplyRating] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReviewItem | null>(null);

  const { showMessage } = useFlashMessage();
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const background = useThemeColor({}, 'background');

  const authHeader = useMemo(
    () =>
      state.accessToken
        ? { Authorization: `Bearer ${state.accessToken}` }
        : undefined,
    [state.accessToken]
  );

  const normalizeEntries = (rawEntries: any[]) =>
    rawEntries.map((entry) => {
      const ratingValue =
        typeof entry.rating === 'number' ? entry.rating : Number(entry.rating);
      return {
        authorId: entry.author_id ?? entry.authorId ?? null,
        rating: Number.isFinite(ratingValue) ? ratingValue : null,
        reviewText: entry.review_text ?? entry.reviewText ?? null,
        createdAt: entry.created_at ?? entry.createdAt ?? null,
      };
    });

  useEffect(() => {
    if (!reviewTypes.length) return;
    if (!activeTab) {
      setActiveTab(reviewTypes[0].key);
      return;
    }
    const exists = reviewTypes.some((type) => type.key === activeTab);
    if (!exists) {
      setActiveTab(reviewTypes[0].key);
    }
  }, [reviewTypes, activeTab]);

  const fetchAllReviews = async () => {
    if (!authHeader) return;
    setLoadingAll(true);
    try {
      const response = await fetch(`${API_URL}/reviews`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setAllItems([]);
        return;
      }

      const payload = Array.isArray(data?.items) ? data.items : [];
      setAllItems(
        payload.map((item) => ({
          entries: normalizeEntries(
            Array.isArray(item.entries)
              ? item.entries
              : Array.isArray(item.review_entries)
                ? item.review_entries
                : []
          ),
          id: item.id,
          name: item.name,
          type: item.type,
          photoUrl: item.photo_url ?? null,
          ratingAvg: typeof item.rating_avg === 'number' ? item.rating_avg : null,
          reviewText: item.review_text ?? null,
          authorId: item.author_id ?? null,
          createdAt: item.created_at ?? null,
        }))
      );
    } catch (error) {
      logger.error('Fetch reviews failed', error);
      setAllItems([]);
    } finally {
      setLoadingAll(false);
    }
  };

  const fetchTypeReviews = async (typeKey: string) => {
    if (!authHeader || !typeKey) return;
    setLoadingModal(true);
    try {
      const response = await fetch(`${API_URL}/reviews?type=${typeKey}`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setModalItems([]);
        return;
      }

      const payload = Array.isArray(data?.items) ? data.items : [];
      setModalItems(
        payload.map((item) => ({
          entries: normalizeEntries(
            Array.isArray(item.entries)
              ? item.entries
              : Array.isArray(item.review_entries)
                ? item.review_entries
                : []
          ),
          id: item.id,
          name: item.name,
          type: item.type,
          photoUrl: item.photo_url ?? null,
          ratingAvg: typeof item.rating_avg === 'number' ? item.rating_avg : null,
          reviewText: item.review_text ?? null,
          authorId: item.author_id ?? null,
          createdAt: item.created_at ?? null,
        }))
      );
    } catch (error) {
      logger.error('Fetch reviews failed', error);
      setModalItems([]);
    } finally {
      setLoadingModal(false);
    }
  };

  useEffect(() => {
    fetchAllReviews();
  }, [authHeader, refreshKey]);

  useEffect(() => {
    if (!modalVisible) return;
    fetchTypeReviews(activeTab);
  }, [modalVisible, activeTab, refreshKey]);

  const featured = [...allItems]
    .filter((item) => item.ratingAvg !== null)
    .sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0))
    .slice(0, 3);

  const myFavorites = [...allItems]
    .filter((item) => item.authorId === state.userId)
    .filter((item) => item.ratingAvg !== null)
    .sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0))
    .slice(0, 3);

  const partnerFavorites = [...allItems]
    .filter((item) => item.authorId && item.authorId !== state.userId)
    .filter((item) => item.ratingAvg !== null)
    .sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0))
    .slice(0, 3);

  const normalizeKey = (item: ReviewItem) =>
    `${item.name}`.trim().toLowerCase() + `::${item.type}`.trim().toLowerCase();

  const myReviewKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of allItems) {
      const entries = item.entries ?? [];
      if (entries.some((entry) => entry.authorId === state.userId)) {
        keys.add(normalizeKey(item));
      }
    }
    return keys;
  }, [allItems, state.userId]);

  const partnerSuggestions = useMemo(() => {
    const results: ReviewItem[] = [];
    const seen = new Set<string>();

    for (const item of allItems) {
      const key = normalizeKey(item);
      if (seen.has(key) || myReviewKeys.has(key)) {
        continue;
      }

      const entries = item.entries ?? [];
      const partnerEntry = entries.find((entry) =>
        entry.authorId && entry.authorId !== state.userId
      );
      if (!partnerEntry) {
        continue;
      }

      results.push(item);
      seen.add(key);
      if (results.length >= 3) {
        break;
      }
    }

    return results;
  }, [allItems, myReviewKeys, state.userId]);

  const openDetail = (review: ReviewItem) => {
    setSelectedReview(review);
    setDetailVisible(true);
  };

  const openReplyModal = (review: ReviewItem) => {
    setReplyTarget(review);
    setReplyRating(null);
    setReplyText('');
    setReplyVisible(true);
  };

  const handleSaveReply = async () => {
    if (!authHeader || !replyTarget) return;
    if (replyRating === null) {
      showMessage({
        type: 'info',
        title: 'Falta nota',
        message: 'Selecciona una nota para tu resena.',
      });
      return;
    }

    setReplySaving(true);
    try {
      const response = await fetch(
        `${API_URL}/reviews/${replyTarget.id}/entries`,
        {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating: replyRating,
            reviewText: replyText.trim() || null,
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudo guardar tu resena.',
        });
        return;
      }

      setReplyVisible(false);
      setReplyTarget(null);
      setReplyRating(null);
      setReplyText('');
      await fetchAllReviews();
      if (modalVisible) {
        await fetchTypeReviews(activeTab);
      }
      showMessage({
        type: 'success',
        title: 'Listo',
        message: 'Tu resena fue guardada.',
      });
    } catch (error) {
      logger.error('Save review reply failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar tu resena.',
      });
    } finally {
      setReplySaving(false);
    }
  };

  useEffect(() => {
    if (!selectedReview) return;
    const updated = allItems.find((item) => item.id === selectedReview.id);
    if (updated) {
      setSelectedReview(updated);
    }
  }, [allItems, selectedReview?.id]);

  const selectedEntries = selectedReview?.entries ?? [];
  const ratingValues = selectedEntries
    .map((entry) => entry.rating)
    .filter((rating): rating is number => typeof rating === 'number');
  const averageRating = ratingValues.length
    ? ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length
    : selectedReview?.ratingAvg ?? null;
  const hasMyEntry = selectedReview
    ? myReviewKeys.has(normalizeKey(selectedReview))
    : false;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Resenas</ThemedText>

      <SectionFlow
        center={
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Resenas destacadas</ThemedText>
            <View style={styles.reviewGrid}>
              {featured.length ? (
                featured.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.reviewTile}
                    onPress={() => openDetail(item)}>
                    <ReviewImageBox
                      uri={item.photoUrl}
                      containerStyle={styles.imageFill}
                      imageStyle={styles.reviewTileImage}
                    />
                    <View style={styles.reviewScore}>
                      <ThemedText type="defaultSemiBold" style={styles.reviewScoreText}>
                        {item.ratingAvg?.toFixed(1) ?? '--'}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))
              ) : (
                <View style={styles.reviewEmptyTile}>
                  <ThemedText>No hay resenas aun.</ThemedText>
                </View>
              )}
            </View>
            <ThemedText type="subtitle">Tu que opinas?</ThemedText>
            <View style={styles.reviewPromptList}>
              {partnerSuggestions.length ? (
                partnerSuggestions.map((item) => (
                  <Pressable
                    key={`prompt-${item.id}`}
                    style={styles.reviewPromptRow}
                    onPress={() => openDetail(item)}>
                    <View style={styles.reviewPromptThumb}>
                      <ReviewImageBox
                        uri={item.photoUrl}
                        containerStyle={styles.imageFill}
                        imageStyle={styles.reviewThumbImage}
                      />
                    </View>
                    <View style={styles.reviewPromptInfo}>
                      <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                      <ThemedText>{item.type}</ThemedText>
                    </View>
                  </Pressable>
                ))
              ) : (
                <ThemedText>No hay nuevas resenas por contestar.</ThemedText>
              )}
            </View>
            <Button
              label="Ver resenas"
              variant="secondary"
              onPress={() => setModalVisible(true)}
            />
          </ThemedView>
        }
        left={
          <>
            <ThemedText type="subtitle">Tus favoritos</ThemedText>
            <View style={styles.favoritesGrid}>
              {myFavorites.map((item) => (
                <Pressable
                  key={`left-${item.id}`}
                  style={styles.favoriteTile}
                  onPress={() => openDetail(item)}>
                  <ReviewImageBox
                    uri={item.photoUrl}
                    containerStyle={styles.imageFill}
                    imageStyle={styles.favoriteTileImage}
                  />
                  <View style={styles.favoriteScore}>
                    <ThemedText type="defaultSemiBold" style={styles.favoriteScoreText}>
                      {item.ratingAvg?.toFixed(1) ?? '--'}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        }
        right={
          <>
            <ThemedText type="subtitle">Favoritos de tu pareja</ThemedText>
            <View style={styles.favoritesGrid}>
              {partnerFavorites.map((item) => (
                <Pressable
                  key={`right-${item.id}`}
                  style={styles.favoriteTile}
                  onPress={() => openDetail(item)}>
                  <ReviewImageBox
                    uri={item.photoUrl}
                    containerStyle={styles.imageFill}
                    imageStyle={styles.favoriteTileImage}
                  />
                  <View style={styles.favoriteScore}>
                    <ThemedText type="defaultSemiBold" style={styles.favoriteScoreText}>
                      {item.ratingAvg?.toFixed(1) ?? '--'}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        }
        minHeight={220}
        onHorizontalScrollActive={(active) =>
          setVerticalScrollEnabled(!active)
        }
      />

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}>
          <Pressable style={styles.reviewsModal} onPress={() => {}}>
            <View style={styles.tabsRow}>
              {reviewTypes.map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && styles.tabButtonActive,
                  ]}>
                  <ThemedText type="defaultSemiBold">{tab.label}</ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.reviewList}>
              {loadingModal ? (
                <ThemedText>Cargando resenas...</ThemedText>
              ) : modalItems.length ? (
                modalItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.reviewRow}
                    onPress={() => openDetail(item)}>
                    <ReviewImageBox
                      uri={item.photoUrl}
                      containerStyle={styles.imageFill}
                      imageStyle={styles.reviewThumbImage}
                    />
                    <View style={styles.reviewInfo}>
                      <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                      <ThemedText>
                        Promedio: {item.ratingAvg?.toFixed(1) ?? '--'}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))
              ) : (
                <ThemedText>No hay resenas en este tipo.</ThemedText>
              )}
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalVisible(false)}>
                <ThemedText type="link">Cerrar</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={detailVisible}
        onRequestClose={() => setDetailVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDetailVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Detalle de resena</ThemedText>
            {selectedReview ? (
              <>
                <View style={styles.reviewDetailHeader}>
                  <View style={styles.reviewDetailPhoto}>
                    {selectedReview.photoUrl ? (
                      <Image
                        source={{ uri: selectedReview.photoUrl }}
                        style={styles.reviewDetailPhotoImage}
                      />
                    ) : (
                      <View style={styles.reviewDetailPhotoPlaceholder} />
                    )}
                  </View>
                  <View style={styles.reviewDetailInfo}>
                    <ThemedText type="defaultSemiBold">{selectedReview.name}</ThemedText>
                    <ThemedText>{selectedReview.type}</ThemedText>
                    <ThemedText>
                      Promedio: {averageRating !== null ? averageRating.toFixed(1) : '--'}
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.reviewEntryList}>
                  {selectedEntries.length ? (
                    selectedEntries.map((entry, index) => {
                      const label =
                        entry.authorId === state.userId ? 'Tu' : 'Pareja';
                      return (
                        <View key={`entry-${index}`} style={styles.reviewEntryCard}>
                          <View style={styles.reviewEntryHeader}>
                            <ThemedText type="defaultSemiBold">{label}</ThemedText>
                            <ThemedText>
                              Nota: {entry.rating !== null ? entry.rating.toFixed(1) : '--'}
                            </ThemedText>
                          </View>
                          <ThemedText>
                            {entry.reviewText ? entry.reviewText : 'Sin comentario.'}
                          </ThemedText>
                        </View>
                      );
                    })
                  ) : (
                    <ThemedText>Sin comentarios aun.</ThemedText>
                  )}
                </View>
                {!hasMyEntry ? (
                  <Button
                    label="Crear tu resena"
                    variant="secondary"
                    onPress={() => openReplyModal(selectedReview)}
                  />
                ) : null}
              </>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setDetailVisible(false)}>
                <ThemedText type="link">Cerrar</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={replyVisible}
        onRequestClose={() => setReplyVisible(false)}>
        <Pressable
          style={styles.modalBackdropCenter}
          onPress={() => setReplyVisible(false)}>
          <Pressable style={styles.modalCardSmall} onPress={() => {}}>
            <ThemedText type="subtitle">Tu resena</ThemedText>
            <ThemedText>
              {replyTarget?.name} · {replyTarget?.type}
            </ThemedText>
            <ThemedText type="defaultSemiBold">Nota</ThemedText>
            <View style={styles.sliderRow}>
              <Slider
                value={replyRating ?? 0}
                minimumValue={0}
                maximumValue={10}
                step={0.1}
                minimumTrackTintColor={tint}
                maximumTrackTintColor={border}
                thumbTintColor={text}
                onValueChange={(value) => setReplyRating(value)}
                style={styles.slider}
              />
              <ThemedText type="defaultSemiBold">
                {(replyRating ?? 0).toFixed(1)}
              </ThemedText>
            </View>
            <Input
              placeholder="Tu detalle"
              value={replyText}
              onChangeText={setReplyText}
            />
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button
                  label={replySaving ? 'Guardando...' : 'Guardar'}
                  variant="primary"
                  onPress={handleSaveReply}
                  disabled={replySaving}
                />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button
                  label="Cancelar"
                  variant="muted"
                  onPress={() => setReplyVisible(false)}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function DatesPage({
  setVerticalScrollEnabled,
  refreshKey,
}: {
  setVerticalScrollEnabled: (enabled: boolean) => void;
  refreshKey: number;
}) {
  const styles = useFlowStyles();
  const { state } = useAuth();
  const { height } = useWindowDimensions();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dayPhotoMap, setDayPhotoMap] = useState<Record<string, string[]>>({});
  const [uploadingDayPhoto, setUploadingDayPhoto] = useState(false);
  const [dayRatingMap, setDayRatingMap] = useState<
    Record<string, { avg: number | null; userRating: number | null; dayId: string }>
  >({});
  const [dayFavoriteMap, setDayFavoriteMap] = useState<
    Record<string, { count: number; isMine: boolean }>
  >({});
  const [selfFavoriteDays, setSelfFavoriteDays] = useState<
    { dayDate: string; starCount: number }[]
  >([]);
  const [partnerFavoriteDays, setPartnerFavoriteDays] = useState<
    { dayDate: string; starCount: number }[]
  >([]);
  const [coupleFavoriteDays, setCoupleFavoriteDays] = useState<
    { dayDate: string; starCount: number }[]
  >([]);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [dayNoteText, setDayNoteText] = useState('');
  const [daySongTitle, setDaySongTitle] = useState('');
  const [daySongArtist, setDaySongArtist] = useState('');
  const [dayOwnerType, setDayOwnerType] = useState<'self' | 'couple' | 'partner'>(
    'couple'
  );
  const [savingDayDetails, setSavingDayDetails] = useState(false);

  const [monthDate, setMonthDate] = useState(() => new Date());
  const calendarHeight = Math.round(height * 0.6);

  useEffect(() => {
    if (refreshKey > 0) {
      setMonthDate((current) => new Date(current));
    }
  }, [refreshKey]);

  const authHeader = useMemo(
    () =>
      state.accessToken
        ? { Authorization: `Bearer ${state.accessToken}` }
        : undefined,
    [state.accessToken]
  );

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    setModalVisible(true);
  };

  const handlePrevMonth = () => setMonthDate((current) => subMonths(current, 1));
  const handleNextMonth = () => setMonthDate((current) => addMonths(current, 1));
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: es });

  const selectedDateLabel = selectedDate
    ? format(selectedDate, "d 'de' MMMM yyyy", { locale: es })
    : '';

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const currentDayPhotos = selectedDateKey
    ? dayPhotoMap[selectedDateKey] ?? []
    : [];
  const currentDayRating = selectedDateKey
    ? dayRatingMap[selectedDateKey] ?? null
    : null;
  const currentDayFavorite = selectedDateKey
    ? dayFavoriteMap[selectedDateKey] ?? { count: 0, isMine: false }
    : { count: 0, isMine: false };

  const dayMeta = useMemo(() => {
    const entries: Record<string, { photos?: number; photoUrls?: string[]; starCount?: number }> = {};
    for (const [dateKey, photos] of Object.entries(dayPhotoMap)) {
      entries[dateKey] = {
        photos: photos.length,
        photoUrls: photos,
        starCount: dayFavoriteMap[dateKey]?.count ?? 0,
      };
    }
    for (const [dateKey, favorite] of Object.entries(dayFavoriteMap)) {
      if (!entries[dateKey]) {
        entries[dateKey] = { starCount: favorite.count };
      } else {
        entries[dateKey].starCount = favorite.count;
      }
    }
    return entries;
  }, [dayPhotoMap, dayFavoriteMap]);

  useEffect(() => {
    if (!modalVisible) return;
    setDayNoteText('');
    setDaySongTitle('');
    setDaySongArtist('');
    setDayOwnerType('couple');
  }, [modalVisible, selectedDateKey]);

  const fetchDayOverview = async () => {
    if (!authHeader) return;
    const from = format(monthDate, 'yyyy-MM-01');
    const to = format(endOfMonth(monthDate), 'yyyy-MM-dd');

    try {
      const response = await fetch(
        `${API_URL}/calendar/days/overview?from=${from}&to=${to}`,
        {
          headers: authHeader,
        }
      );
      const rawText = await response.text();
      const data = rawText ? (() => {
        try {
          return JSON.parse(rawText);
        } catch (parseError) {
          logger.error('Fetch day overview returned invalid JSON', parseError);
          return null;
        }
      })() : null;

      if (!response.ok) {
        if (rawText && rawText.trim().startsWith('<')) {
          logger.error('Fetch day overview returned HTML', { status: response.status });
        }
        setDayPhotoMap({});
        setDayRatingMap({});
        setDayFavoriteMap({});
        setSelfFavoriteDays([]);
        setPartnerFavoriteDays([]);
        setCoupleFavoriteDays([]);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      const nextPhotoMap: Record<string, string[]> = {};
      const nextRatingMap: Record<
        string,
        { avg: number | null; userRating: number | null; dayId: string }
      > = {};

      const nextFavoriteMap: Record<string, { count: number; isMine: boolean }> = {};
      const nextSelfFavorites: { dayDate: string; starCount: number }[] = [];
      const nextPartnerFavorites: { dayDate: string; starCount: number }[] = [];
      const nextCoupleFavorites: { dayDate: string; starCount: number }[] = [];

      for (const item of items) {
        const dateKey = item.day_date;
        const photos = Array.isArray(item.photos) ? item.photos : [];
        const ratings = Array.isArray(item.ratings) ? item.ratings : [];
        const avgRating = typeof item.rating_avg === 'number' ? item.rating_avg : null;
        const userRatingEntry = ratings.find((entry) => entry.user_id === state.userId);
        const userRating = userRatingEntry ? Number(userRatingEntry.rating) : null;

        nextPhotoMap[dateKey] = photos;
        nextRatingMap[dateKey] = {
          avg: avgRating,
          userRating,
          dayId: item.id,
        };

        const favoriteUsers = Array.isArray(item.favorite_users)
          ? item.favorite_users
          : [];
        const favoriteCount = Number(item.favorite_count ?? favoriteUsers.length ?? 0);
        const isMine = Boolean(state.userId && favoriteUsers.includes(state.userId));
        const hasPartner = favoriteUsers.some(
          (userId) => userId && userId !== state.userId
        );
        nextFavoriteMap[dateKey] = { count: favoriteCount, isMine };

        if (isMine) {
          nextSelfFavorites.push({ dayDate: dateKey, starCount: favoriteCount });
        }
        if (hasPartner) {
          nextPartnerFavorites.push({ dayDate: dateKey, starCount: favoriteCount });
        }
        if (favoriteCount >= 2) {
          nextCoupleFavorites.push({ dayDate: dateKey, starCount: favoriteCount });
        }
      }

      nextSelfFavorites.sort((a, b) => (a.dayDate < b.dayDate ? 1 : -1));
      nextPartnerFavorites.sort((a, b) => (a.dayDate < b.dayDate ? 1 : -1));
      nextCoupleFavorites.sort((a, b) => (a.dayDate < b.dayDate ? 1 : -1));
      setSelfFavoriteDays(nextSelfFavorites.slice(0, 10));
      setPartnerFavoriteDays(nextPartnerFavorites.slice(0, 10));
      setCoupleFavoriteDays(nextCoupleFavorites);
      setDayPhotoMap(nextPhotoMap);
      setDayRatingMap(nextRatingMap);
      setDayFavoriteMap(nextFavoriteMap);
    } catch (error) {
      logger.error('Fetch day overview failed', error);
      setDayPhotoMap({});
      setDayRatingMap({});
      setDayFavoriteMap({});
      setSelfFavoriteDays([]);
      setPartnerFavoriteDays([]);
      setCoupleFavoriteDays([]);
    }
  };

  useEffect(() => {
    if (!authHeader) return;
    fetchDayOverview();
  }, [authHeader, monthDate, refreshKey]);

  const handleAddDayPhoto = async () => {
    if (!authHeader || !selectedDate) return;
    if (currentDayPhotos.length >= 5) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: imageMediaType,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    const tempUrl = asset.uri;
    setDayPhotoMap((prev) => {
      const next = prev[selectedDateKey]
        ? [...prev[selectedDateKey]]
        : [];
      next.unshift(tempUrl);
      return { ...prev, [selectedDateKey]: next.slice(0, 5) };
    });

    setUploadingDayPhoto(true);
    try {
      const dayResponse = await fetch(`${API_URL}/calendar/day`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dayDate: selectedDateKey }),
      });
      const dayData = await dayResponse.json();

      if (!dayResponse.ok || !dayData?.day?.id) {
        Alert.alert('Error', dayData?.error ?? 'No se pudo guardar el dia.');
        setDayPhotoMap((prev) => {
          const next = (prev[selectedDateKey] ?? []).filter((url) => url !== tempUrl);
          return { ...prev, [selectedDateKey]: next };
        });
        return;
      }

      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: 'calendar.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      formData.append('scope', 'couple');
      formData.append('model', 'calendar_day');
      formData.append('modelId', dayData.day.id);
      formData.append('date', selectedDateKey);

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: authHeader,
        body: formData,
      });
      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData?.path) {
        Alert.alert('Error', uploadData?.error ?? 'No se pudo subir la imagen.');
        setDayPhotoMap((prev) => {
          const next = (prev[selectedDateKey] ?? []).filter((url) => url !== tempUrl);
          return { ...prev, [selectedDateKey]: next };
        });
        return;
      }

      const photoResponse = await fetch(
        `${API_URL}/calendar/day/${dayData.day.id}/photos`,
        {
          method: 'POST',
          headers: {
            ...authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ photoUrl: uploadData.path }),
        }
      );
      const photoData = await photoResponse.json();

      if (!photoResponse.ok) {
        Alert.alert('Error', photoData?.error ?? 'No se pudo guardar la foto.');
        setDayPhotoMap((prev) => {
          const next = (prev[selectedDateKey] ?? []).filter((url) => url !== tempUrl);
          return { ...prev, [selectedDateKey]: next };
        });
        return;
      }

      setDayPhotoMap((prev) => {
        const next = prev[selectedDateKey]
          ? [...prev[selectedDateKey]]
          : [];
        const index = next.indexOf(tempUrl);
        if (index >= 0) {
          next[index] = uploadData.signedUrl ?? tempUrl;
        } else {
          next.unshift(uploadData.signedUrl ?? tempUrl);
        }
        return { ...prev, [selectedDateKey]: next.slice(0, 5) };
      });
    } catch (error) {
      logger.error('Upload day photo failed', error);
      Alert.alert('Error', 'No se pudo subir la imagen.');
      setDayPhotoMap((prev) => {
        const next = (prev[selectedDateKey] ?? []).filter((url) => url !== tempUrl);
        return { ...prev, [selectedDateKey]: next };
      });
    } finally {
      setUploadingDayPhoto(false);
    }
  };

  const handleSaveDayDetails = async () => {
    if (!authHeader || !selectedDateKey) return;

    setSavingDayDetails(true);
    try {
      const response = await fetch(`${API_URL}/calendar/day`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dayDate: selectedDateKey,
          ownerType: dayOwnerType,
          ownerUserId: dayOwnerType === 'self' ? state.userId : null,
          noteText: dayNoteText.trim() || null,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data?.day?.id) {
        Alert.alert('Error', data?.error ?? 'No se pudo guardar el dia.');
        return;
      }

      if (daySongTitle.trim()) {
        const songResponse = await fetch(
          `${API_URL}/calendar/day/${data.day.id}/song`,
          {
            method: 'POST',
            headers: {
              ...authHeader,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: daySongTitle.trim(),
              artist: daySongArtist.trim() || null,
            }),
          }
        );
        const songData = await songResponse.json();

        if (!songResponse.ok) {
          Alert.alert('Error', songData?.error ?? 'No se pudo guardar la cancion.');
          return;
        }
      }

      Alert.alert('Listo', 'Datos guardados.');
    } catch (error) {
      logger.error('Save day details failed', error);
      Alert.alert('Error', 'No se pudo guardar el dia.');
    } finally {
      setSavingDayDetails(false);
    }
  };

  const ensureDayForFavorite = async () => {
    if (!authHeader || !selectedDateKey) return null;
    if (currentDayRating?.dayId) return currentDayRating.dayId;

    const response = await fetch(`${API_URL}/calendar/day`, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dayDate: selectedDateKey }),
    });
    const data = await response.json();

    if (!response.ok || !data?.day?.id) {
      Alert.alert('Error', data?.error ?? 'No se pudo crear el dia.');
      return null;
    }

    setDayRatingMap((prev) => ({
      ...prev,
      [selectedDateKey]: {
        avg: prev[selectedDateKey]?.avg ?? null,
        userRating: prev[selectedDateKey]?.userRating ?? null,
        dayId: data.day.id,
      },
    }));

    return data.day.id as string;
  };

  const handleToggleFavorite = async () => {
    if (!authHeader || !selectedDateKey || favoriteSaving) return;
    setFavoriteSaving(true);
    try {
      const dayId = await ensureDayForFavorite();
      if (!dayId) return;

      const response = await fetch(`${API_URL}/calendar/day/${dayId}/favorite`, {
        method: 'POST',
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data?.error ?? 'No se pudo actualizar el favorito.');
        return;
      }

      await fetchDayOverview();
    } catch (error) {
      logger.error('Toggle favorite failed', error);
      Alert.alert('Error', 'No se pudo actualizar el favorito.');
    } finally {
      setFavoriteSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Dates</ThemedText>

      <SectionFlow
        center={
          <View style={styles.sectionStack}>
            <ThemedView style={[styles.card, styles.calendarCard, { minHeight: calendarHeight }]}>
              <ThemedText type="subtitle">Calendario</ThemedText>
              <ThemedText>Toca un dia para ver o agregar detalles.</ThemedText>
              <View style={styles.calendarHeader}>
                <Pressable onPress={handlePrevMonth}>
                  <ThemedText type="defaultSemiBold">Anterior</ThemedText>
                </Pressable>
                <ThemedText type="defaultSemiBold" style={styles.calendarMonthLabel}>
                  {monthLabel}
                </ThemedText>
                <Pressable onPress={handleNextMonth}>
                  <ThemedText type="defaultSemiBold">Siguiente</ThemedText>
                </Pressable>
              </View>
              <Calendar
                monthDate={monthDate}
                selectedDate={selectedDate}
                dayMeta={dayMeta}
                onSelectDate={handleDatePress}
              />
            </ThemedView>

            <ThemedView style={styles.card}>
              <ThemedText type="subtitle">Favoritos de pareja</ThemedText>
              {coupleFavoriteDays.length === 0 ? (
                <ThemedText>Sin favoritos en pareja aun.</ThemedText>
              ) : (
                coupleFavoriteDays.map((day) => (
                  <View key={day.dayDate} style={styles.favoriteDayRow}>
                    <ThemedText>{day.dayDate}</ThemedText>
                    <View style={styles.favoriteDayMeta}>
                      <IconSymbol name="star.fill" size={16} color={tint} />
                      <ThemedText>{day.starCount}</ThemedText>
                    </View>
                  </View>
                ))
              )}
            </ThemedView>
          </View>
        }
        left={
          <>
            <ThemedText type="subtitle">Tus favoritos</ThemedText>
            {selfFavoriteDays.length === 0 ? (
              <ThemedText>Sin favoritos aun.</ThemedText>
            ) : (
              selfFavoriteDays.map((day) => (
                <View key={day.dayDate} style={styles.favoriteDayRow}>
                  <ThemedText>{day.dayDate}</ThemedText>
                  <View style={styles.favoriteDayMeta}>
                    <IconSymbol name="star.fill" size={16} color={tint} />
                    <ThemedText>{day.starCount}</ThemedText>
                  </View>
                </View>
              ))
            )}
          </>
        }
        right={
          <>
            <ThemedText type="subtitle">Favoritos de tu pareja</ThemedText>
            {partnerFavoriteDays.length === 0 ? (
              <ThemedText>Sin favoritos aun.</ThemedText>
            ) : (
              partnerFavoriteDays.map((day) => (
                <View key={day.dayDate} style={styles.favoriteDayRow}>
                  <ThemedText>{day.dayDate}</ThemedText>
                  <View style={styles.favoriteDayMeta}>
                    <IconSymbol name="star.fill" size={16} color={tint} />
                    <ThemedText>{day.starCount}</ThemedText>
                  </View>
                </View>
              ))
            )}
          </>
        }
        minHeight={240}
        onHorizontalScrollActive={(active) =>
          setVerticalScrollEnabled(!active)
        }
      />

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: surface }]} onPress={() => {}}>
            <ThemedText type="subtitle">
              Dia {selectedDateLabel}
            </ThemedText>
            <View style={styles.favoriteDayMeta}>
              <Pressable
                style={[
                  styles.favoriteStarButton,
                  currentDayFavorite.isMine && styles.favoriteStarButtonActive,
                ]}
                onPress={handleToggleFavorite}
                disabled={favoriteSaving}>
                <IconSymbol
                  name={currentDayFavorite.isMine ? 'star.fill' : 'star'}
                  size={20}
                  color={currentDayFavorite.isMine ? tint : withAlpha(tint, 0.5)}
                />
              </Pressable>
              <ThemedText>Estrellas: {currentDayFavorite.count}</ThemedText>
            </View>
            <ThemedText>Fotos ({currentDayPhotos.length}/5)</ThemedText>
            <View style={styles.photoRow}>
              {Array.from({ length: 5 }).map((_, index) => {
                const photoUrl = currentDayPhotos[index];
                return (
                  <Pressable
                    key={`slot-${index}`}
                    style={[
                      styles.photoSlot,
                      { borderColor: border, backgroundColor: surface },
                    ]}
                    onPress={photoUrl ? undefined : handleAddDayPhoto}
                    disabled={uploadingDayPhoto || Boolean(photoUrl)}>
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} style={styles.photoSlotImage} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <Button
              label={uploadingDayPhoto ? 'Subiendo' : 'Agregar foto'}
              variant="secondary"
              onPress={handleAddDayPhoto}
              loading={uploadingDayPhoto}
              disabled={currentDayPhotos.length >= 5}
            />

            <ThemedText>Cancion</ThemedText>
            <Input
              placeholder="Titulo de la cancion"
              value={daySongTitle}
              onChangeText={setDaySongTitle}
            />
            <Input
              placeholder="Artista (opcional)"
              value={daySongArtist}
              onChangeText={setDaySongArtist}
            />

            <ThemedText>Texto</ThemedText>
            <Input
              placeholder="Escribe algo del dia"
              value={dayNoteText}
              onChangeText={setDayNoteText}
            />

            <ThemedText>Etiqueta de dueno</ThemedText>
            <View style={styles.tagRow}>
              <Button
                label="Tu"
                variant={dayOwnerType === 'self' ? 'secondary' : 'ghost'}
                onPress={() => setDayOwnerType('self')}
              />
              <Button
                label="Nosotros"
                variant={dayOwnerType === 'couple' ? 'secondary' : 'ghost'}
                onPress={() => setDayOwnerType('couple')}
              />
              <Button
                label="Pareja"
                variant={dayOwnerType === 'partner' ? 'secondary' : 'ghost'}
                onPress={() => setDayOwnerType('partner')}
              />
            </View>

            <Button
              label={savingDayDetails ? 'Guardando...' : 'Guardar detalles'}
              variant="primary"
              onPress={handleSaveDayDetails}
              loading={savingDayDetails}
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalVisible(false)}>
                <ThemedText type="link">Cerrar</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function ProfilesPage({
  setVerticalScrollEnabled,
  onSectionChange,
  refreshKey,
}: {
  setVerticalScrollEnabled: (enabled: boolean) => void;
  onSectionChange: (section: 'left' | 'center' | 'right') => void;
  refreshKey: number;
}) {
  const styles = useFlowStyles();
  const text = useThemeColor({}, 'text');
  const { state } = useAuth();
  const [profiles, setProfiles] = useState<
    {
      userId: string;
      alias: string | null;
      photoUrl: string | null;
      birthday: string | null;
      favoriteFood: string | null;
      personalityType: string | null;
      whatsappUrl: string | null;
      instagramUrl: string | null;
      tiktokUrl: string | null;
      linkedinUrl: string | null;
    }[]
  >([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const authHeader = useMemo(
    () =>
      state.accessToken
        ? { Authorization: `Bearer ${state.accessToken}` }
        : undefined,
    [state.accessToken]
  );

  const fetchProfiles = async () => {
    if (!authHeader) return;
    setLoadingProfiles(true);
    try {
      const response = await fetch(`${API_URL}/profiles`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setProfiles([]);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setProfiles(
        items.map((item) => ({
          userId: item.user_id,
          alias: item.alias ?? null,
          photoUrl: item.photo_url ?? null,
          birthday: item.birthday ?? null,
          favoriteFood: item.favorite_food ?? null,
          personalityType: item.personality_type ?? null,
          whatsappUrl: item.whatsapp_url ?? null,
          instagramUrl: item.instagram_url ?? null,
          tiktokUrl: item.tiktok_url ?? null,
          linkedinUrl: item.linkedin_url ?? null,
        }))
      );
    } catch (error) {
      logger.error('Fetch profiles failed', error);
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [authHeader, refreshKey]);

  const selfProfile =
    profiles.find((profile) => profile.userId === state.userId) ??
    (state.profile
      ? {
          userId: state.profile.userId,
          alias: state.profile.alias ?? null,
          photoUrl: state.profile.photoUrl ?? null,
          birthday: state.profile.birthday ?? null,
          favoriteFood: state.profile.favoriteFood ?? null,
          personalityType: state.profile.personalityType ?? null,
          whatsappUrl: state.profile.whatsappUrl ?? null,
          instagramUrl: state.profile.instagramUrl ?? null,
          tiktokUrl: state.profile.tiktokUrl ?? null,
          linkedinUrl: state.profile.linkedinUrl ?? null,
        }
      : null);

  const partnerProfile = profiles.find(
    (profile) => profile.userId !== state.userId
  );

  const openSocial = async (rawUrl: string | null) => {
    if (!rawUrl) return;
    const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      logger.error('Open social failed', error);
    }
  };

  const renderSocialIcons = (profile: typeof selfProfile) => {
    if (!profile) return null;
    const items = [
      { key: 'whatsapp', url: profile.whatsappUrl },
      { key: 'instagram', url: profile.instagramUrl },
      { key: 'tiktok', url: profile.tiktokUrl },
      { key: 'linkedin', url: profile.linkedinUrl },
    ].filter((item) => item.url);

    if (items.length === 0) {
      return <ThemedText>Sin redes sociales.</ThemedText>;
    }

    return (
      <View style={styles.socialRow}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            style={styles.socialIcon}
            onPress={() => openSocial(item.url ?? null)}>
            <MaterialIcons
              name={SOCIAL_ICONS[item.key]}
              size={20}
              color={text}
            />
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Perfiles</ThemedText>
      <SectionFlow
        center={
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle">Pareja</ThemedText>
            {loadingProfiles ? (
              <ThemedText>Cargando...</ThemedText>
            ) : (
              <>
                <ThemedText>
                  Dia de inicio: {state.couple?.relationshipStartDate ?? 'Sin dato'}
                </ThemedText>
                <ThemedText>
                  Dia de conocernos: {state.couple?.meetDate ?? 'Sin dato'}
                </ThemedText>
              </>
            )}
          </ThemedView>
        }
        left={
          <>
            <ThemedText type="subtitle">{selfProfile?.alias ?? 'Tu'}</ThemedText>
            <View style={styles.profileAvatarRow}>
              <View style={styles.profileAvatar}>
                {selfProfile?.photoUrl ? (
                  <Image
                    source={{ uri: selfProfile.photoUrl }}
                    style={styles.profilePhotoImage}
                  />
                ) : (
                  <View style={styles.profilePhotoPlaceholder} />
                )}
              </View>
            </View>
            <ThemedText>Cumpleaños: {selfProfile?.birthday ?? 'Sin dato'}</ThemedText>
            <ThemedText>Comida favorita: {selfProfile?.favoriteFood ?? 'Sin dato'}</ThemedText>
            <ThemedText>
              Tipo de personalidad: {selfProfile?.personalityType ?? 'Sin dato'}
            </ThemedText>
            {renderSocialIcons(selfProfile)}
          </>
        }
        right={
          <>
            <ThemedText type="subtitle">{partnerProfile?.alias ?? 'Pareja'}</ThemedText>
            <View style={styles.profileAvatarRow}>
              <View style={styles.profileAvatar}>
                {partnerProfile?.photoUrl ? (
                  <Image
                    source={{ uri: partnerProfile.photoUrl }}
                    style={styles.profilePhotoImage}
                  />
                ) : (
                  <View style={styles.profilePhotoPlaceholder} />
                )}
              </View>
            </View>
            <ThemedText>Cumpleaños: {partnerProfile?.birthday ?? 'Sin dato'}</ThemedText>
            <ThemedText>
              Comida favorita: {partnerProfile?.favoriteFood ?? 'Sin dato'}
            </ThemedText>
            <ThemedText>
              Tipo de personalidad: {partnerProfile?.personalityType ?? 'Sin dato'}
            </ThemedText>
            {renderSocialIcons(partnerProfile)}
            <Button label="Editar" variant="secondary" onPress={() => {}} />
          </>
        }
        minHeight={220}
        onHorizontalScrollActive={(active) =>
          setVerticalScrollEnabled(!active)
        }
        onSectionChange={onSectionChange}
      />
    </ThemedView>
  );
}

function GoalsPage() {
  const styles = useFlowStyles();
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const { state } = useAuth();
  const { showMessage } = useFlashMessage();
  const [coupleLevel, setCoupleLevel] = useState(1);
  const [coupleXp, setCoupleXp] = useState(0);
  const [xpThreshold, setXpThreshold] = useState(20);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [rewardFormVisible, setRewardFormVisible] = useState(false);
  const [rewardTab, setRewardTab] = useState<'mine' | 'created'>('mine');
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [rewardStarsBalance, setRewardStarsBalance] = useState(0);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardRedeemingId, setRewardRedeemingId] = useState<string | null>(null);
  const [rewardEditing, setRewardEditing] = useState<RewardItem | null>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardStarsRequired, setRewardStarsRequired] = useState('1');
  const [dailyFormVisible, setDailyFormVisible] = useState(false);
  const [dailyManageVisible, setDailyManageVisible] = useState(false);
  const [dailyTitle, setDailyTitle] = useState('');
  const [dailyStars, setDailyStars] = useState(1);
  const [dailyItems, setDailyItems] = useState<DailyChallengeItem[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [challengeTab, setChallengeTab] = useState<
    'pending' | 'accepted' | 'reported' | 'completed'
  >('accepted');
  const [challengeItems, setChallengeItems] = useState<
    {
      id: string;
      title: string;
      status: string;
      stars: number;
      createdBy: string | null;
      acceptedBy: string | null;
      reportedBy: string | null;
    }[]
  >([]);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeActionId, setChallengeActionId] = useState<string | null>(null);

  const authHeader = useMemo(
    () =>
      state.accessToken
        ? { Authorization: `Bearer ${state.accessToken}` }
        : undefined,
    [state.accessToken]
  );

  const fetchCoupleLevel = async () => {
    if (!authHeader) return;
    try {
      const response = await fetch(`${API_URL}/goals/level`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        return;
      }

      setCoupleLevel(Number(data?.level ?? 1));
      setCoupleXp(Number(data?.xp ?? 0));
      setXpThreshold(Number(data?.threshold ?? 20));
    } catch (error) {
      logger.error('Fetch couple level failed', error);
    }
  };

  const fetchChallenges = async () => {
    if (!authHeader) return;
    setChallengeLoading(true);
    try {
      const response = await fetch(`${API_URL}/home/challenges`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudieron cargar los retos.',
        });
        setChallengeItems([]);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setChallengeItems(
        items.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          stars: Number(item.stars ?? 0),
          createdBy: item.created_by ?? null,
          acceptedBy: item.accepted_by ?? null,
          reportedBy: item.reported_by ?? null,
        }))
      );
    } catch (error) {
      logger.error('Fetch challenges failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los retos.',
      });
      setChallengeItems([]);
    } finally {
      setChallengeLoading(false);
    }
  };

  const fetchDailyChallenges = async () => {
    if (!authHeader) return;
    setDailyLoading(true);
    try {
      const response = await fetch(`${API_URL}/home/daily-challenges`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setDailyItems([]);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setDailyItems(
        items.map((item) => ({
          id: item.id,
          title: item.title,
          stars: Number(item.stars ?? 0),
          createdBy: item.created_by ?? null,
          completedBy: item.completed_by ?? null,
          completedAt: item.completed_at ?? null,
          createdAt: item.created_at ?? null,
        }))
      );
    } catch (error) {
      logger.error('Fetch daily challenges failed', error);
      setDailyItems([]);
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
    fetchDailyChallenges();
  }, [authHeader]);

  useEffect(() => {
    fetchCoupleLevel();
  }, [authHeader]);

  const handleAcceptChallenge = async (challengeId: string) => {
    if (!authHeader || challengeActionId) return;
    setChallengeActionId(challengeId);
    try {
      const response = await fetch(`${API_URL}/home/challenges/${challengeId}/accept`, {
        method: 'POST',
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudo aceptar el reto.',
        });
        return;
      }

      await fetchChallenges();
      showMessage({
        type: 'success',
        title: 'Listo',
        message: 'Reto aceptado.',
      });
    } catch (error) {
      logger.error('Accept challenge failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudo aceptar el reto.',
      });
    } finally {
      setChallengeActionId(null);
    }
  };

  const handleReportChallenge = async (challengeId: string) => {
    if (!authHeader || challengeActionId) return;
    setChallengeActionId(challengeId);
    try {
      const response = await fetch(`${API_URL}/home/challenges/${challengeId}/report`, {
        method: 'POST',
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudo reportar el reto.',
        });
        return;
      }

      await fetchChallenges();
      showMessage({
        type: 'success',
        title: 'Listo',
        message: 'Reto reportado como cumplido.',
      });
    } catch (error) {
      logger.error('Report challenge failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudo reportar el reto.',
      });
    } finally {
      setChallengeActionId(null);
    }
  };

  const handleApproveChallenge = async (challengeId: string) => {
    if (!authHeader || challengeActionId) return;
    setChallengeActionId(challengeId);
    try {
      const response = await fetch(`${API_URL}/home/challenges/${challengeId}/approve`, {
        method: 'POST',
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudo aprobar el reto.',
        });
        return;
      }

      await fetchChallenges();
      await fetchCoupleLevel();
      showMessage({
        type: 'success',
        title: 'Listo',
        message: 'Reto marcado como cumplido.',
      });
    } catch (error) {
      logger.error('Approve challenge failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudo aprobar el reto.',
      });
    } finally {
      setChallengeActionId(null);
    }
  };

  const handleRejectChallenge = async (challengeId: string) => {
    if (!authHeader || challengeActionId) return;
    setChallengeActionId(challengeId);
    try {
      const response = await fetch(`${API_URL}/home/challenges/${challengeId}/reject`, {
        method: 'POST',
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudo rechazar el reto.',
        });
        return;
      }

      await fetchChallenges();
      showMessage({
        type: 'success',
        title: 'Listo',
        message: 'Reto devuelto a aceptado.',
      });
    } catch (error) {
      logger.error('Reject challenge failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudo rechazar el reto.',
      });
    } finally {
      setChallengeActionId(null);
    }
  };

  const fetchRewards = async () => {
    if (!authHeader) return;
    setRewardLoading(true);
    try {
      const response = await fetch(`${API_URL}/goals/rewards`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudieron cargar los beneficios.',
        });
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      const normalized = items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description ?? null,
        starsRequired: Number(item.stars_required ?? 0),
        createdBy: item.created_by ?? null,
        redeemedAt: item.redeemed_at ?? null,
        redeemedBy: item.redeemed_by ?? null,
        createdAt: item.created_at ?? null,
      }));

      setRewards(normalized);
      setRewardStarsBalance(Number(data?.balance ?? 0));
    } catch (error) {
      logger.error('Fetch rewards failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los beneficios.',
      });
    } finally {
      setRewardLoading(false);
    }
  };

  useEffect(() => {
    if (rewardModalVisible) {
      fetchRewards();
    }
  }, [rewardModalVisible]);

  useEffect(() => {
    if (!authHeader) return;
    fetchRewards();
  }, [authHeader]);

  const openCreateReward = () => {
    setRewardEditing(null);
    setRewardTitle('');
    setRewardDescription('');
    setRewardStarsRequired('1');
    setRewardFormVisible(true);
  };

  const openEditReward = (reward: RewardItem) => {
    setRewardEditing(reward);
    setRewardTitle(reward.title);
    setRewardDescription(reward.description ?? '');
    setRewardStarsRequired(String(reward.starsRequired));
    setRewardFormVisible(true);
  };

  const handleSaveReward = async () => {
    if (!authHeader) return;
    if (!rewardTitle.trim()) {
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'Escribe un nombre para el beneficio.',
      });
      return;
    }

    const starsValue = Number(rewardStarsRequired);
    if (!Number.isFinite(starsValue)) {
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'Las estrellas requeridas deben ser un numero.',
      });
      return;
    }

    setRewardSaving(true);
    try {
      const payload = {
        title: rewardTitle.trim(),
        description: rewardDescription.trim() || null,
        starsRequired: starsValue,
      };

      const endpoint = rewardEditing
        ? `${API_URL}/goals/rewards/${rewardEditing.id}`
        : `${API_URL}/goals/rewards`;
      const method = rewardEditing ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudo guardar el beneficio.',
        });
        return;
      }

      setRewardFormVisible(false);
      setRewardEditing(null);
      await fetchRewards();
      showMessage({
        type: 'success',
        title: 'Listo',
        message: rewardEditing ? 'Beneficio actualizado.' : 'Beneficio creado.',
      });
    } catch (error) {
      logger.error('Save reward failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar el beneficio.',
      });
    } finally {
      setRewardSaving(false);
    }
  };

  const handleRedeemReward = async (reward: RewardItem) => {
    if (!authHeader) return;
    if (rewardRedeemingId) return;

    if (reward.starsRequired > rewardStarsBalance) {
      showMessage({
        type: 'info',
        title: 'Sin estrellas',
        message: 'No tienes suficientes estrellas para canjear.',
      });
      return;
    }

    setRewardRedeemingId(reward.id);
    try {
      const response = await fetch(`${API_URL}/goals/rewards/${reward.id}/redeem`, {
        method: 'POST',
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudo canjear el beneficio.',
        });
        return;
      }

      setRewards((prev) =>
        prev.map((item) =>
          item.id === reward.id
            ? { ...item, redeemedAt: data.reward?.redeemed_at ?? new Date().toISOString() }
            : item
        )
      );
      setRewardStarsBalance((prev) => prev - reward.starsRequired);
      showMessage({
        type: 'success',
        title: 'Listo',
        message: 'Beneficio canjeado.',
      });
    } catch (error) {
      logger.error('Redeem reward failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudo canjear el beneficio.',
      });
    } finally {
      setRewardRedeemingId(null);
    }
  };

  const openCreateDaily = () => {
    setDailyTitle('');
    setDailyStars(1);
    setDailyFormVisible(true);
  };

  const handleSaveDaily = async () => {
    if (!authHeader) return;
    if (dailyItems.length >= 4) {
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'Ya tienes 4 retos diarios hoy.',
      });
      return;
    }

    if (dailyStarsLeft <= 0) {
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No tienes estrellas disponibles para crear retos hoy.',
      });
      return;
    }

    if (!dailyTitle.trim()) {
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'Escribe un titulo para el reto diario.',
      });
      return;
    }

    if (!Number.isFinite(dailyStars) || dailyStars < 1) {
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'Selecciona al menos 1 estrella.',
      });
      return;
    }

    if (dailyStars > dailyStarsLeft) {
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No puedes usar mas estrellas de las disponibles.',
      });
      return;
    }

    setDailySaving(true);
    try {
      const response = await fetch(`${API_URL}/home/daily-challenges`, {
        method: 'POST',
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: dailyTitle.trim(), stars: dailyStars }),
      });
      const data = await response.json();

      if (!response.ok) {
        showMessage({
          type: 'error',
          title: 'Error',
          message: data?.error ?? 'No se pudo crear el reto diario.',
        });
        return;
      }

      setDailyFormVisible(false);
      await fetchDailyChallenges();
      showMessage({
        type: 'success',
        title: 'Listo',
        message: 'Reto diario creado.',
      });
    } catch (error) {
      logger.error('Save daily challenge failed', error);
      showMessage({
        type: 'error',
        title: 'Error',
        message: 'No se pudo crear el reto diario.',
      });
    } finally {
      setDailySaving(false);
    }
  };

  const acceptedChallenges = challengeItems.filter(
    (item) => item.status === 'accepted'
  );
  const pendingChallenges = challengeItems.filter(
    (item) => item.status === 'pending'
  );
  const reportedChallenges = challengeItems.filter(
    (item) => item.status === 'reported_accomplishment'
  );
  const completedChallenges = challengeItems.filter(
    (item) => item.status === 'completed'
  );
  const reviewableChallenges = reportedChallenges.filter(
    (item) => item.createdBy === state.userId
  );

  const mineRewards = rewards.filter(
    (reward) => reward.createdBy !== state.userId && !reward.redeemedAt
  );
  const createdRewards = rewards.filter((reward) => reward.createdBy === state.userId);
  const upcomingRewards = [...mineRewards]
    .map((reward) => ({
      reward,
      remaining: Math.max(0, reward.starsRequired - rewardStarsBalance),
    }))
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 3);

  const dailyStarsUsed = dailyItems.reduce(
    (total, item) => total + Number(item.stars ?? 0),
    0
  );
  const dailyStarsLeft = Math.max(0, 5 - dailyStarsUsed);
  const remainingXp = Math.max(0, xpThreshold - coupleXp);

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Goals</ThemedText>

      <ThemedView style={styles.levelCard}>
        <View style={styles.levelProgressRow}>
          <View style={styles.levelHeart}>
            <MaterialIcons name="favorite-border" size={72} color={tint} />
            <ThemedText type="defaultSemiBold" style={styles.levelHeartValue}>
              {coupleLevel}
            </ThemedText>
          </View>
          <View style={styles.levelBarStack}>
            <ThemedText type="defaultSemiBold">
              EXP: {coupleXp}/{xpThreshold} (faltan {remainingXp})
            </ThemedText>
            <View style={styles.levelBarTrack}>
              <View
                style={[
                  styles.levelBarFill,
                  {
                    width: `${Math.min(1, xpThreshold ? coupleXp / xpThreshold : 0) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </ThemedView>

      <ThemedView style={styles.levelCard}>
        <ThemedText type="subtitle">Retos actuales</ThemedText>
        <View style={styles.challengeList}>
          {acceptedChallenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeRow}>
              <View style={styles.challengeInfo}>
                <ThemedText type="defaultSemiBold">{challenge.title}</ThemedText>
                <ThemedText>Aceptado</ThemedText>
              </View>
              {challenge.acceptedBy === state.userId ? (
                <Pressable
                  style={styles.challengeActionButton}
                  onPress={() => handleReportChallenge(challenge.id)}
                  disabled={challengeActionId === challenge.id}>
                  <ThemedText type="defaultSemiBold" style={styles.challengeActionText}>
                    Cumplir
                  </ThemedText>
                </Pressable>
              ) : null}
              <View style={styles.challengeStars}>
                <IconSymbol name="star.fill" size={20} color={tint} />
                <ThemedText type="defaultSemiBold">{challenge.stars}</ThemedText>
              </View>
            </View>
          ))}
          {acceptedChallenges.length === 0 ? (
            <ThemedText>Sin retos aceptados.</ThemedText>
          ) : null}
        </View>
        <Button
          label="Ver todos"
          variant="secondary"
          onPress={() => setChallengeModalVisible(true)}
        />
      </ThemedView>

      {reviewableChallenges.length > 0 ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">Fue cumplido?</ThemedText>
          {reviewableChallenges.map((challenge) => (
              <View key={challenge.id} style={styles.challengeReviewRow}>
                <View style={styles.challengeInfo}>
                  <ThemedText type="defaultSemiBold">{challenge.title}</ThemedText>
                  <ThemedText>Reportado</ThemedText>
                </View>
                <View style={styles.challengeReviewActions}>
                  <Pressable
                    style={styles.challengeApproveButton}
                    onPress={() => handleApproveChallenge(challenge.id)}
                    disabled={challengeActionId === challenge.id}>
                    <IconSymbol name="checkmark" size={18} color={background} />
                  </Pressable>
                  <Pressable
                    style={styles.challengeRejectButton}
                    onPress={() => handleRejectChallenge(challenge.id)}
                    disabled={challengeActionId === challenge.id}>
                    <IconSymbol name="xmark" size={18} color={background} />
                  </Pressable>
                </View>
              </View>
            ))} : null
        </ThemedView>
      ) : null}

      <ThemedView style={styles.card}>
        <View style={styles.rewardHeaderRow}>
          <ThemedText type="subtitle">Retos diarios</ThemedText>
          <Button
            label="Gestionar"
            variant="secondary"
            onPress={() => setDailyManageVisible(true)}
          />
        </View>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Beneficios</ThemedText>
        {upcomingRewards.length === 0 ? (
          <ThemedText>Sin beneficios disponibles.</ThemedText>
        ) : (
          upcomingRewards.map(({ reward, remaining }) => {
            const progress = reward.starsRequired
              ? Math.min(1, rewardStarsBalance / reward.starsRequired)
              : 1;
            const canRedeem = remaining === 0;

            return (
              <View key={reward.id} style={styles.rewardProgressRow}>
                <View style={styles.rewardProgressInfo}>
                  <ThemedText type="defaultSemiBold">{reward.title}</ThemedText>
                  <ThemedText>
                    {rewardStarsBalance}/{reward.starsRequired} estrellas
                  </ThemedText>
                  <View style={styles.rewardProgressTrack}>
                    <View
                      style={[
                        styles.rewardProgressFill,
                        { width: `${progress * 100}%` },
                      ]}
                    />
                  </View>
                </View>
                {canRedeem ? (
                  <Pressable
                    style={styles.rewardRedeemButton}
                    onPress={() => handleRedeemReward(reward)}
                    disabled={rewardRedeemingId === reward.id}>
                    <ThemedText type="defaultSemiBold" style={styles.rewardRedeemText}>
                      Canjear
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
        <Button
          label="Ver beneficios"
          variant="secondary"
          onPress={() => setRewardModalVisible(true)}
        />
      </ThemedView>

      <Modal
        animationType="slide"
        transparent
        visible={challengeModalVisible}
        onRequestClose={() => setChallengeModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setChallengeModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.rewardHeaderRow}>
              <ThemedText type="subtitle">Retos</ThemedText>
            </View>
            <View style={styles.rewardTabRow}>
              <Pressable
                onPress={() => setChallengeTab('pending')}
                style={[
                  styles.rewardTab,
                  challengeTab === 'pending' && styles.rewardTabActive,
                ]}>
                <ThemedText type="defaultSemiBold">Por aceptar</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setChallengeTab('accepted')}
                style={[
                  styles.rewardTab,
                  challengeTab === 'accepted' && styles.rewardTabActive,
                ]}>
                <ThemedText type="defaultSemiBold">Aceptados</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setChallengeTab('completed')}
                style={[
                  styles.rewardTab,
                  challengeTab === 'completed' && styles.rewardTabActive,
                ]}>
                <ThemedText type="defaultSemiBold">Cumplidos</ThemedText>
              </Pressable>
            </View>

            {challengeLoading ? (
              <View style={styles.rewardLoadingRow}>
                <ActivityIndicator size="small" color={tint} />
              </View>
            ) : (
              (() => {
                const list =
                  challengeTab === 'pending'
                    ? pendingChallenges
                    : challengeTab === 'accepted'
                      ? acceptedChallenges
                      : challengeTab === 'reported'
                        ? reportedChallenges
                      : completedChallenges;

                if (list.length === 0) {
                  return <ThemedText>Sin retos en esta seccion.</ThemedText>;
                }

                return list.map((challenge) => (
                  <View key={challenge.id} style={styles.challengeRow}>
                    <View style={styles.challengeInfo}>
                      <ThemedText type="defaultSemiBold">{challenge.title}</ThemedText>
                      <ThemedText>
                        {challenge.status === 'pending'
                          ? 'Pendiente'
                          : challenge.status === 'accepted'
                            ? 'Aceptado'
                            : challenge.status === 'reported_accomplishment'
                              ? 'Reportado'
                            : 'Cumplido'}
                      </ThemedText>
                    </View>
                    {challenge.status === 'pending' &&
                    challenge.createdBy !== state.userId ? (
                      <Pressable
                        style={styles.challengeActionButton}
                        onPress={() => handleAcceptChallenge(challenge.id)}
                        disabled={challengeActionId === challenge.id}>
                        <ThemedText type="defaultSemiBold" style={styles.challengeActionText}>
                          Aceptar
                        </ThemedText>
                      </Pressable>
                    ) : null}
                    {challenge.status === 'accepted' &&
                    challenge.acceptedBy === state.userId ? (
                      <Pressable
                        style={styles.challengeActionButton}
                        onPress={() => handleReportChallenge(challenge.id)}
                        disabled={challengeActionId === challenge.id}>
                        <ThemedText type="defaultSemiBold" style={styles.challengeActionText}>
                          Cumplir
                        </ThemedText>
                      </Pressable>
                    ) : null}
                    {challenge.status === 'reported_accomplishment' &&
                    challenge.createdBy === state.userId ? (
                      <View style={styles.challengeReviewActions}>
                        <Pressable
                          style={styles.challengeApproveButton}
                          onPress={() => handleApproveChallenge(challenge.id)}
                          disabled={challengeActionId === challenge.id}>
                          <IconSymbol name="checkmark" size={18} color={background} />
                        </Pressable>
                        <Pressable
                          style={styles.challengeRejectButton}
                          onPress={() => handleRejectChallenge(challenge.id)}
                          disabled={challengeActionId === challenge.id}>
                          <IconSymbol name="xmark" size={18} color={background} />
                        </Pressable>
                      </View>
                    ) : null}
                    <View style={styles.challengeStars}>
                      <IconSymbol name="star.fill" size={20} color={tint} />
                      <ThemedText type="defaultSemiBold">{challenge.stars}</ThemedText>
                    </View>
                  </View>
                ));
              })()
            )}

            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cerrar" variant="muted" onPress={() => setChallengeModalVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={rewardModalVisible}
        onRequestClose={() => setRewardModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRewardModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.rewardHeaderRow}>
              <ThemedText type="subtitle">Beneficios</ThemedText>
              <Button label="Crear" variant="secondary" onPress={openCreateReward} />
            </View>
            <ThemedText type="defaultSemiBold">
              Tus estrellas: {rewardStarsBalance}
            </ThemedText>
            <View style={styles.rewardTabRow}>
              <Pressable
                onPress={() => setRewardTab('mine')}
                style={[
                  styles.rewardTab,
                  rewardTab === 'mine' && styles.rewardTabActive,
                ]}>
                <ThemedText type="defaultSemiBold">Mis recompensas</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setRewardTab('created')}
                style={[
                  styles.rewardTab,
                  rewardTab === 'created' && styles.rewardTabActive,
                ]}>
                <ThemedText type="defaultSemiBold">Hechas por mi</ThemedText>
              </Pressable>
            </View>

            {rewardLoading ? (
              <View style={styles.rewardLoadingRow}>
                <ActivityIndicator size="small" color={tint} />
              </View>
            ) : rewardTab === 'mine' ? (
              mineRewards.length === 0 ? (
                <ThemedText>Sin recompensas disponibles.</ThemedText>
              ) : (
                mineRewards.map((reward) => (
                  <View key={reward.id} style={styles.rewardCard}>
                    <View style={styles.rewardInfo}>
                      <ThemedText type="defaultSemiBold">{reward.title}</ThemedText>
                      {reward.description ? (
                        <ThemedText>{reward.description}</ThemedText>
                      ) : null}
                      <ThemedText>Estrellas: {reward.starsRequired}</ThemedText>
                    </View>
                    <Button
                      label={
                        reward.starsRequired > rewardStarsBalance
                          ? 'Sin estrellas'
                          : 'Canjear'
                      }
                      variant="primary"
                      disabled={
                        reward.starsRequired > rewardStarsBalance ||
                        rewardRedeemingId === reward.id
                      }
                      onPress={() => handleRedeemReward(reward)}
                    />
                  </View>
                ))
              )
            ) : createdRewards.length === 0 ? (
              <ThemedText>Sin beneficios creados.</ThemedText>
            ) : (
              createdRewards.map((reward) => (
                <View key={reward.id} style={styles.rewardCard}>
                  <View style={styles.rewardInfo}>
                    <ThemedText type="defaultSemiBold">{reward.title}</ThemedText>
                    {reward.description ? (
                      <ThemedText>{reward.description}</ThemedText>
                    ) : null}
                    <ThemedText>Estrellas: {reward.starsRequired}</ThemedText>
                    {reward.redeemedAt ? (
                      <ThemedText>Canjeado</ThemedText>
                    ) : null}
                  </View>
                  <Button
                    label="Editar"
                    variant="secondary"
                    disabled={Boolean(reward.redeemedAt)}
                    onPress={() => openEditReward(reward)}
                  />
                </View>
              ))
            )}

            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cerrar" variant="muted" onPress={() => setRewardModalVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={rewardFormVisible}
        onRequestClose={() => setRewardFormVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRewardFormVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">
              {rewardEditing ? 'Editar beneficio' : 'Nuevo beneficio'}
            </ThemedText>
            <Input placeholder="Nombre" value={rewardTitle} onChangeText={setRewardTitle} />
            <Input
              placeholder="Descripcion (opcional)"
              value={rewardDescription}
              onChangeText={setRewardDescription}
            />
            <Input
              placeholder="Estrellas requeridas"
              value={rewardStarsRequired}
              onChangeText={setRewardStarsRequired}
              keyboardType="numeric"
            />
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button
                  label={rewardSaving ? 'Guardando...' : 'Guardar'}
                  variant="primary"
                  onPress={handleSaveReward}
                  disabled={rewardSaving}
                />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cancelar" variant="muted" onPress={() => setRewardFormVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={dailyManageVisible}
        onRequestClose={() => setDailyManageVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDailyManageVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.rewardHeaderRow}>
              <ThemedText type="subtitle">Retos diarios</ThemedText>
              <Button
                label="Crear"
                variant="secondary"
                onPress={openCreateDaily}
                disabled={dailyItems.length >= 4 || dailyStarsLeft <= 0}
              />
            </View>
            <ThemedText>Estrellas disponibles hoy: {dailyStarsLeft}/5</ThemedText>
            {dailyItems.length >= 4 ? (
              <ThemedText>Limite de 4 retos alcanzado.</ThemedText>
            ) : dailyStarsLeft <= 0 ? (
              <ThemedText>Sin estrellas disponibles para crear retos.</ThemedText>
            ) : null}
            {dailyLoading ? (
              <ThemedText>Cargando...</ThemedText>
            ) : dailyItems.length === 0 ? (
              <ThemedText>Sin retos diarios hoy.</ThemedText>
            ) : (
              dailyItems.map((item) => (
                <View key={item.id} style={styles.challengeRow}>
                  <View style={styles.challengeInfo}>
                    <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                    <ThemedText>
                      {item.completedAt ? 'Cumplido' : 'Pendiente'}
                    </ThemedText>
                  </View>
                  <View style={styles.challengeStars}>
                    <IconSymbol name="star.fill" size={20} color={tint} />
                    <ThemedText type="defaultSemiBold">{item.stars}</ThemedText>
                  </View>
                </View>
              ))
            )}
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonSecondary}>
                <Button
                  label="Cerrar"
                  variant="muted"
                  onPress={() => setDailyManageVisible(false)}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={dailyFormVisible}
        onRequestClose={() => setDailyFormVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDailyFormVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Nuevo reto diario</ThemedText>
            <Input placeholder="Titulo" value={dailyTitle} onChangeText={setDailyTitle} />
            <ThemedText type="defaultSemiBold">Estrellas</ThemedText>
            <ThemedText>Disponibles hoy: {dailyStarsLeft}/5</ThemedText>
            <View style={styles.sliderRow}>
              <Slider
                value={dailyStars}
                minimumValue={1}
                maximumValue={Math.max(1, dailyStarsLeft)}
                step={1}
                minimumTrackTintColor={tint}
                maximumTrackTintColor={withAlpha(tint, 0.2)}
                thumbTintColor={tint}
                onValueChange={(value) => setDailyStars(Math.round(value))}
                style={styles.slider}
              />
              <ThemedText type="defaultSemiBold">{dailyStars}</ThemedText>
            </View>
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonPrimary}>
                <Button
                  label={dailySaving ? 'Guardando...' : 'Guardar'}
                  variant="primary"
                  onPress={handleSaveDaily}
                  disabled={dailySaving || dailyItems.length >= 4 || dailyStarsLeft <= 0}
                />
              </View>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cancelar" variant="muted" onPress={() => setDailyFormVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function PhotosPage({
  refreshKey,
  initialPhotos,
  initialPhotosLoaded,
}: {
  refreshKey: number;
  initialPhotos: { id: string; url: string; date: string }[];
  initialPhotosLoaded: boolean;
}) {
  const styles = useFlowStyles();
  const { state } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [recentPhotos, setRecentPhotos] = useState<
    { id: string; url: string; date: string }[]
  >([]);
  const [allPhotos, setAllPhotos] = useState<
    { id: string; url: string; date: string }[]
  >([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const authHeader = useMemo(
    () =>
      state.accessToken
        ? { Authorization: `Bearer ${state.accessToken}` }
        : undefined,
    [state.accessToken]
  );

  useEffect(() => {
    if (!initialPhotosLoaded) return;
    if (initialPhotos.length === 0) return;
    setRecentPhotos(initialPhotos);
  }, [initialPhotos, initialPhotosLoaded]);

  const fetchRecentPhotos = async () => {
    if (!authHeader) return;
    setLoadingPhotos(true);

    try {
      const response = await fetch(`${API_URL}/photos?scope=couple&limit=10`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setRecentPhotos([]);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setRecentPhotos(
        items.map((item) => ({
          id: item.id,
          url: item.url ?? item.photo_url,
          date: item.date ?? new Date().toISOString().slice(0, 10),
        }))
      );
    } catch (error) {
      logger.error('Fetch photos failed', error);
      setRecentPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const fetchAllPhotos = async () => {
    if (!authHeader) return;
    setLoadingPhotos(true);
    try {
      const response = await fetch(`${API_URL}/photos?scope=couple`, {
        headers: authHeader,
      });
      const data = await response.json();

      if (!response.ok) {
        setAllPhotos([]);
        return;
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setAllPhotos(
        items.map((item) => ({
          id: item.id,
          url: item.url ?? item.photo_url,
          date: item.date ?? new Date().toISOString().slice(0, 10),
        }))
      );
    } catch (error) {
      logger.error('Fetch all photos failed', error);
      setAllPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    if (!authHeader) return;
    if (!initialPhotosLoaded) return;
    if (initialPhotos.length > 0 && refreshKey === 0) return;
    fetchRecentPhotos();
  }, [authHeader, refreshKey, initialPhotosLoaded, initialPhotos.length]);

  useEffect(() => {
    if (modalVisible) {
      fetchAllPhotos();
    }
  }, [modalVisible]);

  const visiblePhotos = recentPhotos.slice(0, 10);
  const sortedAllPhotos = [...allPhotos].sort((a, b) => {
    const aTime = Date.parse(a.date);
    const bTime = Date.parse(b.date);
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });

  return (
    <ThemedView style={styles.container}>
      <View style={styles.photoHeader}>
        <ThemedText type="title">Fotos</ThemedText>
        <Pressable onPress={() => setModalVisible(true)}>
          <ThemedText type="link">Ver todas</ThemedText>
        </Pressable>
      </View>

      {!modalVisible ? (
        <View style={styles.photoGrid}>
          {loadingPhotos ? (
            <ThemedText>Cargando...</ThemedText>
          ) : null}
          {!loadingPhotos && visiblePhotos.length === 0 ? (
            <ThemedText>No hay fotos aun.</ThemedText>
          ) : null}
          {visiblePhotos.map((photo) => (
            <PhotoTile key={photo.id} uri={photo.url} />
          ))}
        </View>
      ) : null}

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="subtitle">Todas las fotos</ThemedText>
            <View style={styles.photoGrid}>
              {loadingPhotos ? (
                <ThemedText>Cargando...</ThemedText>
              ) : null}
              {!loadingPhotos && sortedAllPhotos.length === 0 ? (
                <ThemedText>No hay fotos aun.</ThemedText>
              ) : null}
              {sortedAllPhotos.map((photo) => (
                <PhotoTile key={photo.id} uri={photo.url} />
              ))}
            </View>
            <View style={styles.modalButtonRow}>
              <View style={styles.modalButtonSecondary}>
                <Button label="Cerrar" variant="muted" onPress={() => setModalVisible(false)} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function SettingsPage() {
  return <SettingsView />;
}

type SectionFlowProps = {
  center: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
  minHeight?: number;
  onHorizontalScrollActive?: (active: boolean) => void;
  onSectionChange?: (section: 'left' | 'center' | 'right') => void;
};

function SectionFlow({
  center,
  left,
  right,
  minHeight,
  onHorizontalScrollActive,
  onSectionChange,
}: SectionFlowProps) {
  const styles = useFlowStyles();
  const { width, height } = useWindowDimensions();
  const cardWidth = Math.min(width * 0.9, 420);
  const cardHeight = height;
  const revealGap = Math.max(32, width - cardWidth - 24);
  const hiddenLeft = -width - cardWidth;
  const hiddenRight = width + cardWidth;
  const leftX = useRef(new Animated.Value(hiddenLeft)).current;
  const rightX = useRef(new Animated.Value(hiddenRight)).current;
  const activeSide = useRef<'left' | 'right' | null>(null);

  const pivotY = height / 2;
  const maxAngleDeg = 85;

  const leftRotate = leftX.interpolate({
    inputRange: [hiddenLeft, -revealGap],
    outputRange: [`-${maxAngleDeg}deg`, '0deg'],
    extrapolate: 'clamp',
  });

  const rightRotate = rightX.interpolate({
    inputRange: [revealGap, hiddenRight],
    outputRange: ['0deg', `${maxAngleDeg}deg`],
    extrapolate: 'clamp',
  });

  const leftDrift = leftX.interpolate({
    inputRange: [hiddenLeft, -revealGap],
    outputRange: [-width * 0.15, 0],
    extrapolate: 'clamp',
  });

  const rightDrift = rightX.interpolate({
    inputRange: [revealGap, hiddenRight],
    outputRange: [0, width * 0.15],
    extrapolate: 'clamp',
  });

  const snapLeft = (open: boolean, velocity = 0) =>
    Animated.spring(leftX, {
      toValue: open ? -revealGap : hiddenLeft,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
      velocity,
    }).start(() => {
      if (!open) activeSide.current = null;
    });

  const snapRight = (open: boolean, velocity = 0) =>
    Animated.spring(rightX, {
      toValue: open ? revealGap : hiddenRight,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
      velocity,
    }).start(() => {
      if (!open) activeSide.current = null;
    });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dy) < 12,
      onPanResponderGrant: () => {
        leftX.stopAnimation();
        rightX.stopAnimation();
        onHorizontalScrollActive?.(true);
      },
      onPanResponderMove: (_, gesture) => {
        if (activeSide.current === 'right') {
          const next = Math.min(hiddenRight, Math.max(revealGap, gesture.dx + revealGap));
          rightX.setValue(next);
          return;
        }
        if (activeSide.current === 'left') {
          const next = Math.max(hiddenLeft, Math.min(-revealGap, gesture.dx - revealGap));
          leftX.setValue(next);
          return;
        }

        if (gesture.dx > 0) {
          activeSide.current = 'left';
          const next = Math.max(hiddenLeft, Math.min(-revealGap, hiddenLeft + gesture.dx));
          leftX.setValue(next);
        } else if (gesture.dx < 0) {
          activeSide.current = 'right';
          const next = Math.min(hiddenRight, Math.max(revealGap, hiddenRight + gesture.dx));
          rightX.setValue(next);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const threshold = width * 0.2;
        if (activeSide.current === 'left') {
          const shouldOpen = gesture.dx > threshold || gesture.vx > 0.4;
          snapLeft(shouldOpen, gesture.vx);
          if (shouldOpen) {
            rightX.setValue(hiddenRight);
            onSectionChange?.('left');
          } else {
            onSectionChange?.('center');
          }
          onHorizontalScrollActive?.(false);
          return;
        }
        if (activeSide.current === 'right') {
          const shouldOpen = gesture.dx < -threshold || gesture.vx < -0.4;
          snapRight(shouldOpen, gesture.vx);
          if (shouldOpen) {
            leftX.setValue(hiddenLeft);
            onSectionChange?.('right');
          } else {
            onSectionChange?.('center');
          }
          onHorizontalScrollActive?.(false);
        }
      },
      onPanResponderTerminate: () => {
        onHorizontalScrollActive?.(false);
        onSectionChange?.('center');
      },
    })
  ).current;

  return (
    <View style={styles.sectionRoot} {...panResponder.panHandlers}>
      <View style={styles.sectionCenter}>{center}</View>
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.sectionCard,
            {
              width: cardWidth,
              height: cardHeight,
              transform: [
                { translateX: leftX },
                { translateY: pivotY },
                { rotate: leftRotate },
                { translateY: -pivotY },
                { translateX: leftDrift },
              ],
            },
          ]}>
          {left}
        </Animated.View>

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.sectionCard,
            {
              width: cardWidth,
              height: cardHeight,
              transform: [
                { translateX: rightX },
                { translateY: pivotY },
                { rotate: rightRotate },
                { translateY: -pivotY },
                { translateX: rightDrift },
              ],
            },
          ]}>
          {right}
        </Animated.View>
    </View>
  );
}

