import { create } from 'zustand';

export interface ExtractionProgress {
  step: number;
  total: number;
  message: string;
}

interface ExtractionState {
  isExtracting: boolean;
  activeUrl: string | null;
  activeTitle: string | null; // 제목을 추출 중일 때 보여주기 위함 (초기엔 임시 제목 사용 가능)
  activeThumbnailUrl: string | null;
  progress: ExtractionProgress | null;
  error: string | null;
  completedRecipeId: number | null; // 성공 시 모달에 필요한 ID
  abortController: AbortController | null;

  // Actions
  startExtraction: (url: string) => Promise<void>;
  cancelExtraction: () => void;
  reset: () => void;
  clearCompleted: () => void;
}

export const useExtractionStore = create<ExtractionState>((set, get) => ({
  isExtracting: false,
  activeUrl: null,
  activeTitle: null,
  activeThumbnailUrl: null,
  progress: null,
  error: null,
  completedRecipeId: null,
  abortController: null,

  startExtraction: async (url: string) => {
    // 이미 진행 중이면 무시
    if (get().isExtracting) return;

    const controller = new AbortController();

    // URL 검증 및 도메인 추출
    let domain = '링크';
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      set({ error: '올바른 URL을 입력해 주세요.' });
      return;
    }

    try {
      set({
        isExtracting: true,
        activeUrl: url,
        activeTitle: `${domain} 레시피 추출 중...`,
        activeThumbnailUrl: null,
        progress: { step: 1, total: 4, message: '레시피 분석 준비 중...' },
        error: null,
        completedRecipeId: null,
        abortController: controller,
      });

      const response = await fetch('/api/recipes/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? '레시피 추출에 실패했습니다.');
      }

      if (!response.headers.get('content-type')?.includes('text/event-stream')) {
        throw new Error('스트리밍 응답 형식이 올바르지 않습니다.');
      }

      if (!response.body) throw new Error('서버 응답이 없습니다.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      try {
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });

            let eventEndIndex;
            while ((eventEndIndex = buffer.indexOf('\n\n')) >= 0) {
              const eventStr = buffer.slice(0, eventEndIndex);
              buffer = buffer.slice(eventEndIndex + 2);

              if (eventStr.startsWith('data: ')) {
                try {
                  const data = JSON.parse(eventStr.slice(6));

                  if (data.error) {
                    throw new Error(data.message || data.error);
                  }

                  if (data.step && data.total) {
                    set({
                      progress: { step: data.step, total: data.total, message: data.message },
                      activeThumbnailUrl: data.thumbnailUrl || get().activeThumbnailUrl,
                      activeTitle: data.title || get().activeTitle,
                    });
                  }

                  if (data.recipeId) {
                    set({
                      isExtracting: false,
                      completedRecipeId: data.recipeId,
                      abortController: null,
                      activeTitle: data.title || get().activeTitle,
                    });
                    // clearCompleted는 GlobalExtractionToast가 10초 후 자동으로 처리함
                    return;
                  }
                } catch (parseErr: unknown) {
                  if (parseErr instanceof Error && !parseErr.message.includes('JSON')) {
                    throw parseErr;
                  }
                }
              }
            }
          }
        }

        // 루프가 끝났는데도 return되지 않았다면(성공 응답을 못 받았다면) 에러
        throw new Error('추출 스트림이 완료 신호 없이 종료되었습니다.');
      } finally {
        // 리더가 닫히지 않았을 경우를 대비해 확실히 닫음
        reader.releaseLock();
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Extraction aborted by user');
        set({ isExtracting: false, abortController: null, activeUrl: null });
      } else {
        set({
          isExtracting: false,
          error: err instanceof Error ? err.message : '레시피 추출에 실패했습니다.',
          abortController: null,
        });
      }
    } finally {
      // 어떤 이유로든 종료되면 컨트롤러 정리 (이미 완료 처리된 경우는 위 return에서 빠져나감)
      const state = get();
      if (state.isExtracting) {
        set({ isExtracting: false, abortController: null });
      }
    }
  },

  cancelExtraction: () => {
    const { abortController } = get();
    if (abortController) {
      console.log('Aborting extraction fetch...');
      abortController.abort();
      set({ isExtracting: false, abortController: null, activeUrl: null, progress: null });
    }
  },

  reset: () => {
    set({
      isExtracting: false,
      activeUrl: null,
      activeTitle: null,
      activeThumbnailUrl: null,
      progress: null,
      error: null,
      completedRecipeId: null,
      abortController: null,
    });
  },

  clearCompleted: () => {
    set({ completedRecipeId: null, activeTitle: null, activeThumbnailUrl: null });
  },
}));
