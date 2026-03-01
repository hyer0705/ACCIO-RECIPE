'use client';

import Header from '@/components/layout/Header';
import RecipeUrlForm from '@/components/recipe/RecipeUrlForm';
import ExtractionLoading from '@/components/recipe/ExtractionLoading';
import { useRecipeExtraction } from '@/hooks/useRecipeExtraction';

export default function Home() {
  const { mutate: extractRecipe, isPending } = useRecipeExtraction();

  return (
    <div className="min-h-screen bg-[#FAF6E9] font-sans">
      <Header />

      <main className="flex flex-col items-center justify-center p-4">
        {isPending ? (
          <ExtractionLoading />
        ) : (
          <RecipeUrlForm onSubmitUrl={extractRecipe} isPending={isPending} />
        )}
      </main>
    </div>
  );
}
