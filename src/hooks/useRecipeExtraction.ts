import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface ExtractionProgress {
  step: number;
  total: number;
  message: string;
}

export const useRecipeExtraction = () => {
  const router = useRouter();
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const extractRecipe = useCallback(
    async (url: string) => {
      setIsExtracting(true);
      setProgress(null);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/recipes/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        });

        if (!response.body) throw new Error('서버 응답이 없습니다.');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let buffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });

            let eventEndIndex;
            while ((eventEndIndex = buffer.indexOf('\n\n')) >= 0) {
              const eventStr = buffer.slice(0, eventEndIndex);
              buffer = buffer.slice(eventEndIndex + 2); // \n\n 까지 잘라냄

              if (eventStr.startsWith('data: ')) {
                try {
                  const data = JSON.parse(eventStr.slice(6));

                  if (data.error) {
                    throw new Error(data.message || data.error);
                  }

                  if (data.step && data.total) {
                    setProgress({ step: data.step, total: data.total, message: data.message });
                  }

                  if (data.recipeId) {
                    router.push(`/recipes/preview/${data.recipeId}`);
                    setIsExtracting(false);
                    return;
                  }
                } catch (parseErr: unknown) {
                  // 추출 에러는 바로 throw, JSON 깨짐은 무시하고 다음 청크 대기
                  if (parseErr instanceof Error && !parseErr.message.includes('JSON')) {
                    throw parseErr;
                  }
                }
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Extraction aborted by user');
          // 취소된 경우 에러를 세팅하지 않고 조용하게 폼으로 롤백
        } else {
          setError(err instanceof Error ? err.message : '레시피 추출에 실패했습니다.');
        }
      } finally {
        setIsExtracting(false);
        abortControllerRef.current = null;
      }
    },
    [router],
  );

  const cancelExtraction = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return {
    extractRecipe, // 기존 호환성을 위해 이름 유지
    cancelExtraction,
    isExtracting,
    progress,
    error,
    resetError,
  };
};
