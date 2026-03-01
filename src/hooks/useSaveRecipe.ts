import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ExtractedRecipeData } from '@/store/useRecipeStore';

interface SaveRecipeResponse {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string | string[];
}

export const useSaveRecipe = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (recipeData: ExtractedRecipeData) => {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData),
      });

      const data: SaveRecipeResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          Array.isArray(data.error) ? data.error.join(', ') : data.message || '레시피 저장 실패',
        );
      }

      return data;
    },
    onSuccess: () => {
      // 저장이 성공하면, 나의 서재(레시피 목록) 페이지가 있다면 거기로 이동
      alert('레시피가 성공적으로 저장되었습니다!');
      router.push('/'); // TODO: 나의 요리 서재 페이지 경로 확인 후 변경 (일단 홈으로 임시 이동)
    },
    onError: (error) => {
      alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    },
  });
};
