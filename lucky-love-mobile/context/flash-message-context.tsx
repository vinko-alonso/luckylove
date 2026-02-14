import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StatusBar, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

type FlashType = 'success' | 'error' | 'info';

type FlashMessage = {
  id: number;
  type: FlashType;
  title?: string;
  message: string;
  duration?: number;
};

type FlashContextValue = {
  showMessage: (message: Omit<FlashMessage, 'id'>) => void;
};

const FlashMessageContext = createContext<FlashContextValue | undefined>(undefined);

export function FlashMessageProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<FlashMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((nextMessage: Omit<FlashMessage, 'id'>) => {
    const id = Date.now();
    setMessage({ id, ...nextMessage });
  }, []);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -12,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMessage(null);
      });
    }, message.duration ?? 2600);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [message, opacity, translateY]);

  const value = useMemo<FlashContextValue>(
    () => ({
      showMessage,
    }),
    [showMessage]
  );

  return (
    <FlashMessageContext.Provider value={value}>
      <View style={styles.host} pointerEvents="box-none">
        {children}
        {message ? (
          <FlashBanner message={message} opacity={opacity} translateY={translateY} />
        ) : null}
      </View>
    </FlashMessageContext.Provider>
  );
}

export function useFlashMessage() {
  const context = useContext(FlashMessageContext);

  if (!context) {
    throw new Error('useFlashMessage must be used within FlashMessageProvider');
  }

  return context;
}

type FlashBannerProps = {
  message: FlashMessage;
  opacity: Animated.Value;
  translateY: Animated.Value;
};

function FlashBanner({ message, opacity, translateY }: FlashBannerProps) {
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');

  const backgroundColor =
    message.type === 'error'
      ? '#991b1b'
      : message.type === 'success'
        ? '#4caf50'
        : surface;

  const textColor = message.type === 'info' ? text : '#ffffff';
  const iconName =
    message.type === 'error'
      ? 'error-outline'
      : message.type === 'success'
        ? 'check'
        : 'info-outline';
  const topInset = StatusBar.currentHeight ?? 0;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor, paddingTop: 10 + topInset, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none">
      <View style={styles.bannerRow}>
        <View style={styles.iconBubble}>
          <MaterialIcons name={iconName} size={18} color={backgroundColor} />
        </View>
        <View style={styles.textColumn}>
          {message.title ? (
            <ThemedText style={[styles.title, { color: textColor }]}>
              {message.title}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.messageText, { color: textColor }]}>
            {message.message}
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 6,
    zIndex: 1000,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
