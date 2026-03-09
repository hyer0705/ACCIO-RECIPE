'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import RecipeUrlForm from '@/components/recipe/RecipeUrlForm';
import ExtractionLoading from '@/components/recipe/ExtractionLoading';
import { useExtractionStore } from '@/store/useExtractionStore';

export default function Home() {
  const router = useRouter();
  const { startExtraction, isExtracting, error, reset, completedRecipeId, clearCompleted } =
    useExtractionStore();

  useEffect(() => {
    if (completedRecipeId) {
      router.push(`/recipes/preview/${completedRecipeId}`);
      // 추출 성공 알림 상태를 조금 뒤에 클리어하여 다른 곳에서 중복 반응하지 않게 함
      const timer = setTimeout(() => {
        clearCompleted();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [completedRecipeId, router, clearCompleted]);

  const handleSubmit = async (url: string) => {
    reset();
    await startExtraction(url);
  };

  return (
    <div className="min-h-screen bg-[#FAF6E9] font-sans">
      <Header />

      <main className="flex flex-col items-center justify-center p-4">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-300 text-red-700 px-6 py-4 rounded-xl font-medium shadow-sm max-w-xl text-center">
            {error}
          </div>
        )}

        {isExtracting ? (
          <ExtractionLoading />
        ) : (
          <RecipeUrlForm onSubmitUrl={handleSubmit} isPending={isExtracting} />
        )}
      </main>
    </div>
  );
}
