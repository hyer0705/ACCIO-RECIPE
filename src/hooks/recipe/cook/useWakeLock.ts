import { useEffect, useRef, useCallback } from 'react';

/**
 * 화면 꺼짐 방지(Screen Wake Lock API)를 관리하는 커스텀 훅
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  // isMountedRef: async callbacks check this before writing to wakeLockRef
  const isMountedRef = useRef(false);
  // sentinelRef: per-call sentinel object; a stale async resolution won't match
  const sentinelRef = useRef<object | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if (!('wakeLock' in navigator)) {
        console.warn('Screen Wake Lock API is not supported on this browser/device.');
        return;
      }

      // 이미 활성화된 상태라면 중복 요청 방지
      if (wakeLockRef.current && !wakeLockRef.current.released) return;

      // Assign a unique sentinel for this specific call so that if a newer call
      // supersedes this one before the await resolves, we can detect it.
      const sentinel = {};
      sentinelRef.current = sentinel;

      const lock = await navigator.wakeLock.request('screen');

      // Discard the result if the component unmounted or a newer call won the race.
      if (!isMountedRef.current || sentinelRef.current !== sentinel) {
        lock.release().catch(() => {});
        return;
      }

      wakeLockRef.current = lock;
      console.log('Screen Wake Lock is active.');

      lock.onrelease = () => {
        // Only clear wakeLockRef when this lock is still the current one;
        // a stale onrelease must not overwrite a lock acquired by a newer call.
        if (sentinelRef.current === sentinel) {
          wakeLockRef.current = null;
          sentinelRef.current = null;
        }
        console.log('Screen Wake Lock was released.');
      };
    } catch (err) {
      console.error('Failed to acquire Screen Wake Lock:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current;
    if (!lock || lock.released) return;

    // Invalidate the sentinel first so any in-flight requestWakeLock call
    // discards its result instead of overwriting wakeLockRef after release.
    sentinelRef.current = null;
    wakeLockRef.current = null;

    try {
      await lock.release();
      console.log('Screen Wake Lock released manually.');
    } catch (err) {
      console.error('Failed to release Screen Wake Lock:', err);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
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
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Fire-and-forget: cleanup cannot be async, but isMountedRef guards
      // any in-flight requestWakeLock from writing to wakeLockRef after this.
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  return { releaseWakeLock, requestWakeLock };
}
