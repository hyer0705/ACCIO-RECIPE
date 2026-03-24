'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import ExtractionProgressCard from '@/components/recipe/ExtractionProgressCard';
import { useMyRecipes } from '@/hooks/recipe/useMyRecipes';
import { useExtractionRefresh } from '@/hooks/recipe/useExtractionRefresh';
import { useDeleteRecipe } from '@/hooks/recipe/useDeleteRecipe';
import DeleteConfirmationModal from '@/components/recipe/DeleteConfirmationModal';
import { RecipesResponse } from '@/hooks/recipe/useMyRecipes';
import { DashboardData } from '@/hooks/recipe/useDashboardData';

export default function MyRecipesPage() {
  const queryClient = useQueryClient();
  const [isManageMode, setIsManageMode] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // 비즈니스 로직 분리
  const { data, isLoading, isError } = useMyRecipes();
  const { mutate: deleteRecipe, isPending: isDeleting } = useDeleteRecipe();
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
        {recipes.length > 0 && (
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className="ml-auto px-5 py-1.5 text-[14px] font-bold rounded-[8px] bg-white border border-[#EAE4D9] text-[#3D2E24] shadow-sm hover:bg-gray-50 transition-colors"
          >
            {isManageMode ? '완료' : '삭제'}
          </button>
        )}
      </div>

      {/* Grid Layout (3x3 on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {/* Extraction Progress Card (Square) */}
        <ExtractionProgressCard variant="square" />

        {/* Recipe Cards */}
        {recipes.map((recipe) => {
          const content = (
            <div
              className={`bg-white rounded-[20px] overflow-hidden shadow-sm transition-all group border flex flex-col h-full relative ${
                isManageMode
                  ? 'border-[#FF4444] border-2 scale-[0.98]'
                  : 'border-[#F0EBE0] hover:shadow-md'
              }`}
            >
              {isManageMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteTargetId(recipe.recipe_id);
                  }}
                  aria-label={`레시피 삭제: ${recipe.title}`}
                  className="absolute top-4 right-4 w-8 h-8 bg-[#FF4444] rounded-full flex items-center justify-center shadow-md hover:bg-[#E03C3C] hover:scale-110 active:scale-95 transition-all z-20"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              )}
              <div className="aspect-square w-full bg-linear-to-br from-[#FF9A44]/10 to-[#FF5A28]/10 relative overflow-hidden flex items-center justify-center">
                {recipe.thumbnail_url ? (
                  <Image
                    src={recipe.thumbnail_url}
                    alt={recipe.title}
                    fill
                    className={`object-cover transition-transform duration-500 ${!isManageMode && 'group-hover:scale-105'}`}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={`text-4xl transition-transform ${!isManageMode && 'group-hover:scale-110'}`}
                    >
                      🍳
                    </span>
                    <span className="text-[11px] font-bold text-[#FF5A28]/40 uppercase tracking-widest">
                      No Image
                    </span>
                  </div>
                )}
                {/* Optional Star Icon placeholder for favorites */}
                {!isManageMode && (
                  <div className="absolute top-4 left-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <span className="text-[14px]">⭐</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5 flex-1 flex flex-col">
                <h3
                  className={`text-[17px] font-bold text-[#3C2D23] mb-2 line-clamp-1 transition-colors ${!isManageMode && 'group-hover:text-[#FF5A28]'}`}
                >
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
            </div>
          );

          if (isManageMode) {
            return (
              <div key={recipe.recipe_id} className="block cursor-default">
                {content}
              </div>
            );
          }

          return (
            <Link
              key={recipe.recipe_id}
              href={`/recipes/preview/${recipe.recipe_id}`}
              className="block"
            >
              {content}
            </Link>
          );
        })}

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

      <DeleteConfirmationModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async () => {
          if (deleteTargetId) {
            // 1. 기존 데이터 스냅샷 캡처 (에러 발생 시 롤백용)
            const prevRecipes = queryClient.getQueryData<RecipesResponse>(['my-recipes']);
            const prevDashboard = queryClient.getQueryData<DashboardData>(['dashboard']);

            // 2. 캐시를 즉시 업데이트하여 UI에서 즉시 제거 (낙관적 업데이트)
            queryClient.setQueryData<RecipesResponse>(['my-recipes'], (old) => {
              if (!old || !old.data) return old;
              return {
                ...old,
                data: old.data.filter((r) => r.recipe_id !== deleteTargetId),
              };
            });

            queryClient.setQueryData<DashboardData>(['dashboard'], (old) => {
              if (!old || !old.recent_recipes) return old;
              return {
                ...old,
                recent_recipes: old.recent_recipes.filter((r) => r.recipe_id !== deleteTargetId),
              };
            });

            // 3. 실제 삭제 요청 수행
            deleteRecipe(deleteTargetId, {
              onSuccess: () => {
                setDeleteTargetId(null);
                // 삭제 후 남은 레시피가 없으면 관리 모드 종료 (이미 필터링된 데이터 기준)
                const currentRecipes =
                  queryClient.getQueryData<RecipesResponse>(['my-recipes'])?.data || [];
                if (currentRecipes.length === 0) {
                  setIsManageMode(false);
                }
              },
              onError: (error) => {
                console.error('삭제 실패, 롤백 수행:', error);
                // 에러 발생 시 이전 데이터로 복구
                if (prevRecipes) queryClient.setQueryData(['my-recipes'], prevRecipes);
                if (prevDashboard) queryClient.setQueryData(['dashboard'], prevDashboard);
                alert('레시피 삭제에 실패했습니다. 다시 시도해 주세요.');
              },
              onSettled: () => {
                // 성공하든 실패하든 서버와 동기화를 위해 무효화
                queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              },
            });
          }
        }}
        isDeleting={isDeleting}
      />
    </div>
  );
}
