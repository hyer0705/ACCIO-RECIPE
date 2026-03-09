'use client';

import Header from '@/components/layout/Header';
import RecipeUrlForm from '@/components/recipe/RecipeUrlForm';
import ExtractionLoading from '@/components/recipe/ExtractionLoading';
import { useRecipeExtraction } from '@/hooks/useRecipeExtraction';

export default function Home() {
  const { extractRecipe, cancelExtraction, isExtracting, progress, error, resetError } =
    useRecipeExtraction();

  const handleSubmit = async (url: string) => {
    resetError();
    await extractRecipe(url);
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
          <ExtractionLoading progress={progress} onCancel={cancelExtraction} />
        ) : (
          <RecipeUrlForm onSubmitUrl={handleSubmit} isPending={isExtracting} />
        )}
      </main>
    </div>
  );
}
