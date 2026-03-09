'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useExtractionStore } from '@/store/useExtractionStore';
import { RecipesResponse } from './useMyRecipes';
import { DashboardData } from './useDashboardData';

/**
 * 추출 완료 시 대시보드 및 레시피 목록 캐시를 수동으로 업데이트(낙관적 업데이트)하고
 * 쿼리를 무효화(갱신)하는 훅
 */
export function useExtractionRefresh() {
  const queryClient = useQueryClient();
  const { completedRecipeId, activeTitle, activeThumbnailUrl } = useExtractionStore();

  useEffect(() => {
    if (completedRecipeId) {
      console.log(
        'Recipe extraction completed, updating cache optimistically...',
        completedRecipeId,
      );

      const newRecipeTemplate = {
        recipe_id: completedRecipeId,
        title: activeTitle || '새로운 레시피',
        thumbnail_url: activeThumbnailUrl,
        difficulty: 'Medium',
        servings: 1,
        created_at: new Date().toISOString(),
      };

      // 1. 내 레시피 목록 캐시 즉시 업데이트
      queryClient.setQueryData<RecipesResponse>(['my-recipes'], (old) => {
        if (!old || !old.data) return old;

        const exists = old.data.some((r) => r.recipe_id === completedRecipeId);
        if (exists) {
          // 이미 존재하면 해당 항목 업데이트 (PENDING -> COMPLETED)
          return {
            ...old,
            data: old.data.map((r) =>
              r.recipe_id === completedRecipeId ? { ...r, ...newRecipeTemplate } : r,
            ),
          };
        }
        // 존재하지 않으면 최상단에 추가
        return {
          ...old,
          data: [newRecipeTemplate, ...old.data],
        };
      });

      // 2. 대시보드 최근 레시피 캐시 즉시 업데이트
      queryClient.setQueryData<DashboardData>(['dashboard'], (old) => {
        if (!old || !old.recent_recipes) return old;

        const exists = old.recent_recipes.some((r) => r.recipe_id === completedRecipeId);
        if (exists) {
          return {
            ...old,
            recent_recipes: old.recent_recipes.map((r) =>
              r.recipe_id === completedRecipeId ? { ...r, ...newRecipeTemplate } : r,
            ),
          };
        }
        return {
          ...old,
          recent_recipes: [newRecipeTemplate, ...old.recent_recipes].slice(0, 6),
        };
      });

      // 3. 실제 서버 데이터와 동기화를 위해 백그라운드 무효화 시작
      // (refetchType: 'active'는 현재 화면에 보이는 것만 즉시 다시 불러옵니다)
      queryClient.invalidateQueries({
        queryKey: ['dashboard'],
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: ['my-recipes'],
        refetchType: 'active',
      });
    }
  }, [completedRecipeId, activeTitle, activeThumbnailUrl, queryClient]);
}
