import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ExtractedRecipeData, useRecipeStore } from '@/store/useRecipeStore';

interface ExtractResponse {
  success: boolean;
  data?: ExtractedRecipeData;
  error?: string;
}

export const useRecipeExtraction = () => {
  const router = useRouter();
  const setRecipeData = useRecipeStore((state) => state.setRecipeData);

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

      if (!response.ok || !data.success) {
        throw new Error(data.error || '레시피 추출에 실패했습니다.');
      }

      return data.data!;
    },
    onSuccess: (data) => {
      // 1. 전역 상태에 추출된 데이터 저장
      setRecipeData(data);
      // 2. 미리보기 페이지로 이동
      router.push('/recipes/preview');
    },
    onError: (error) => {
      // 에러 발생 시 사용자에게 알림
      alert(`레시피 분석 실패: ${error.message}`);
    },
  });
};
