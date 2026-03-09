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

    // 임시 제목: URL 도메인이나 기본 텍스트
    const domain = new URL(url).hostname.replace('www.', '');

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
            buffer = buffer.slice(eventEndIndex + 2);

            if (eventStr.startsWith('data: ')) {
              try {
                const data = JSON.parse(eventStr.slice(6));

                if (data.error) {
                  throw new Error(data.message || data.error);
                }

                if (data.step && data.total) {
                  // 만약 백엔드에서 제목이나 썸네일도 같이 내려준다면 여기서 업데이트 가능
                  set({
                    progress: { step: data.step, total: data.total, message: data.message },
                    activeThumbnailUrl: data.thumbnailUrl || get().activeThumbnailUrl,
                    activeTitle: data.title || get().activeTitle,
                  });
                }

                if (data.recipeId) {
                  // 완료
                  set({
                    isExtracting: false,
                    completedRecipeId: data.recipeId,
                    abortController: null,
                    activeTitle: data.title || get().activeTitle, // 백엔드에서 제목 넘겨주는 경우 대비
                  });
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
    }
  },

  cancelExtraction: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
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
