'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import RecipeUrlForm from '@/components/recipe/RecipeUrlForm';
import ExtractionLoading from '@/components/recipe/ExtractionLoading';
import { useRecipeExtraction } from '@/hooks/useRecipeExtraction';

export default function Home() {
  const { mutateAsync: extractRecipe } = useRecipeExtraction();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSubmit = async (url: string) => {
    try {
      setIsNavigating(true);
      await extractRecipe(url);
    } catch {
      setIsNavigating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6E9] font-sans">
      <Header />

      <main className="flex flex-col items-center justify-center p-4">
        {isNavigating ? (
          <ExtractionLoading />
        ) : (
          <RecipeUrlForm onSubmitUrl={handleSubmit} isPending={isNavigating} />
        )}
      </main>
    </div>
  );
}
