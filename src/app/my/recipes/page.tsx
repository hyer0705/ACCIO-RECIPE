'use client';

import Link from 'next/link';
import Image from 'next/image';
import ExtractionProgressCard from '@/components/recipe/ExtractionProgressCard';
import { useMyRecipes } from '@/hooks/recipe/useMyRecipes';
import { useExtractionRefresh } from '@/hooks/recipe/useExtractionRefresh';

export default function MyRecipesPage() {
  // 비즈니스 로직 분리
  const { data, isLoading, isError } = useMyRecipes();
  useExtractionRefresh();

  if (isLoading) {
    return <div className="flex justify-center items-center h-64 text-[#A59A94]">로딩 중...</div>;
  }

  if (isError || !data?.success) {
    return (
      <div className="flex justify-center items-center h-64 text-[#EF4444]">
        데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  const recipes = data.data;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-bold text-[#3C2D23]">레시피</h1>
        <span className="text-[16px] font-semibold text-gray-400 mt-1">총 {recipes.length}개</span>
      </div>

      {/* Grid Layout (3x3 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {/* Extraction Progress Card (Square) */}
        <ExtractionProgressCard variant="square" />

        {/* Recipe Cards */}
        {recipes.map((recipe) => (
          <Link
            key={recipe.recipe_id}
            href={`/recipes/preview/${recipe.recipe_id}`}
            className="bg-white rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-all group border border-[#F0EBE0] flex flex-col"
          >
            <div className="aspect-square w-full bg-linear-to-br from-[#FF9A44]/10 to-[#FF5A28]/10 relative overflow-hidden flex items-center justify-center">
              {recipe.thumbnail_url ? (
                <Image
                  src={recipe.thumbnail_url}
                  alt={recipe.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl group-hover:scale-110 transition-transform">🍳</span>
                  <span className="text-[11px] font-bold text-[#FF5A28]/40 uppercase tracking-widest">
                    No Image
                  </span>
                </div>
              )}
              {/* Optional Star Icon placeholder for favorites */}
              <div className="absolute top-4 left-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[14px]">⭐</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="text-[17px] font-bold text-[#3C2D23] mb-2 line-clamp-1 group-hover:text-[#FF5A28] transition-colors">
                {recipe.title}
              </h3>
              <div className="flex items-center gap-3 text-[13px] text-gray-400 mt-auto">
                <span>
                  🕒{' '}
                  {recipe.difficulty === 'Easy'
                    ? '15분'
                    : recipe.difficulty === 'Medium'
                      ? '30분'
                      : '45분'}
                </span>
                <span>🔥 {recipe.difficulty || '보통'}</span>
              </div>
              <div className="text-[12px] text-gray-300 mt-2">
                {new Date(recipe.created_at).toLocaleDateString()}
              </div>
            </div>
          </Link>
        ))}

        {/* Empty state if nothing yet */}
        {recipes.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-[24px] border border-dashed border-gray-200 flex flex-col items-center justify-center gap-4">
            <div className="text-4xl">📚</div>
            <p className="text-gray-400 font-medium">아직 저장된 레시피가 없습니다.</p>
            <Link href="/" className="text-[#FF5A28] font-bold hover:underline">
              첫 레시피 분석하러 가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
