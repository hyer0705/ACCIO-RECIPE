import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
// unused import removed

interface ExtractResponse {
  success: boolean;
  recipeId?: number;
  error?: string;
}

export const useRecipeExtraction = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (url: string) => {
      const response = await fetch('/api/recipes/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data: ExtractResponse = await response.json();

      if (!response.ok || !data.success || !data.recipeId) {
        throw new Error(data.error || '레시피 추출에 실패했습니다.');
      }

      return data.recipeId;
    },
    onSuccess: (recipeId) => {
      // 바로 생성된 레시피 ID로 이동하며 UI 렌더링을 페이지쪽 React Query에 위임
      router.push(`/recipes/preview/${recipeId}`);
    },
    onError: (error) => {
      // 에러 발생 시 사용자에게 알림
      alert(`레시피 분석 실패: ${error.message}`);
    },
  });
};
