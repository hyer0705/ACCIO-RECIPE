import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ExtractedRecipeData } from '@/store/useRecipeStore';

interface SaveRecipeResponse {
  success: boolean;
  message: string;
  data?: {
    recipe_id: number;
    title: string;
  };
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
    onSuccess: (responseData) => {
      // 저장이 성공하면, 해당 레시피의 조리 모드 페이지로 이동
      if (responseData.data?.recipe_id) {
        router.push(`/recipes/${responseData.data.recipe_id}/cook`);
      } else {
        router.push('/');
      }
    },
    onError: (error) => {
      alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    },
  });
};
