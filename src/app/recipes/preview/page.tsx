'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import RecipePreview from '@/components/recipe/RecipePreview';
import { useRecipeStore } from '@/store/useRecipeStore';

export default function PreviewPage() {
  const router = useRouter();
  const recipeData = useRecipeStore((state) => state.recipeData);

  useEffect(() => {
    if (!recipeData) {
      // 데이터가 없으면 뒤로가기 혹은 홈으로 리다이렉트 (비정상 접근 방지)
      alert('레시피 정보가 존재하지 않습니다. 메인 화면으로 돌아갑니다.');
      router.replace('/');
    }
  }, [recipeData, router]);

  if (!recipeData) {
    return null; // or loading skeleton
  }

  return (
    <div className="min-h-screen bg-[#FAF6E9] font-sans">
      <Header />
      <main className="pb-16">
        <RecipePreview data={recipeData} />
      </main>
    </div>
  );
}
