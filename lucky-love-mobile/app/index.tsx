import { useEffect } from 'react';
import { router, useRootNavigationState, useSegments } from 'expo-router';

import { useAuth } from '@/context/auth-context';

export default function Index() {
  const { state } = useAuth();
  const rootNavigationState = useRootNavigationState();
  const segments = useSegments();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (!segments.length) return;

    if (!state.userId) {
      router.replace('/login');
      return;
    }

    if (state.profile?.coupleId) {
      router.replace('/flow');
      return;
    }

    router.replace('/profile-setup');
  }, [rootNavigationState?.key, segments.length, state.profile?.coupleId, state.userId]);

  return null;
}
