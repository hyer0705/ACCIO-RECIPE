import { useEffect, useRef, useCallback } from 'react';

/**
 * 화면 꺼짐 방지(Screen Wake Lock API)를 관리하는 커스텀 훅
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        // 이미 활성화된 상태라면 중복 요청 방지
        if (wakeLockRef.current && !wakeLockRef.current.released) return;

        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Screen Wake Lock is active.');

        wakeLockRef.current.onrelease = () => {
          wakeLockRef.current = null;
          console.log('Screen Wake Lock was released.');
        };
      } else {
        console.warn('Screen Wake Lock API is not supported on this browser/device.');
      }
    } catch (err) {
      console.error('Failed to acquire Screen Wake Lock:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (!wakeLockRef.current || wakeLockRef.current.released) return;
    try {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('Screen Wake Lock released manually.');
    } catch (err) {
      console.error('Failed to release Screen Wake Lock:', err);
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    requestWakeLock();

    // Visibility Change 대응: 사용자가 탭을 전환했다가 돌아올 때 자동으로 재요청
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 컴포넌트가 언마운트될 때 Wake Lock 해제 및 이벤트 리스너 제거
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  return { releaseWakeLock, requestWakeLock };
}
