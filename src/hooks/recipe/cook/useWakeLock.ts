import { useEffect, useRef } from 'react';

/**
 * 화면 꺼짐 방지(Screen Wake Lock API)를 관리하는 커스텀 훅
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock is active.');
        } else {
          console.warn('Screen Wake Lock API is not supported on this browser/device.');
        }
      } catch (err) {
        // 권한 거부 또는 기타 에러 발생 시 로그를 남깁니다.
        console.error('Failed to acquire Screen Wake Lock:', err);
      }
    }

    requestWakeLock();

    // 컴포넌트가 언마운트될 때 Wake Lock 해제
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Screen Wake Lock released on unmount.');
      }
    };
  }, []);

  // 외부에서 수동으로 Wake Lock을 해제하고 싶을 때 사용하는 함수
  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('Screen Wake Lock released manually.');
    }
  };

  return { releaseWakeLock };
}
