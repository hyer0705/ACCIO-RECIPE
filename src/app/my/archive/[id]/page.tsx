'use client';

import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

import ArchiveDetailHeader from './_components/ArchiveDetailHeader';
import TabMenu, { TabType } from './_components/TabMenu';
import OverviewTab from './_components/OverviewTab';
import GrowthLogTab from './_components/GrowthLogTab';

interface RecipeDetail {
  recipe_id: number;
  title: string;
  latest_log: {
    log_id: number;
    status: 'SUCCESS' | 'REGRET' | 'FAIL';
    lesson_note: string | null;
    companion: string | null;
    cooked_at: string;
  } | null;
  base_servings: number;
  ingredients: {
    ri_id: number;
    name: string;
    amount: number | null;
    unit: string | null;
  }[];
  steps: {
    step_id: number;
    step_order: number;
    instruction: string;
  }[];
}

interface CookingLog {
  log_id: number;
  status: 'SUCCESS' | 'REGRET' | 'FAIL';
  lesson_note: string | null;
  companion: string | null;
  cooked_at: string;
}

export default function MyArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const recipeId = Number(unwrappedParams.id);
  const isValidRecipeId =
    /^\d+$/.test(unwrappedParams.id) && Number.isInteger(recipeId) && recipeId > 0;
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [servings, setServings] = useState<number>(1);
  const initializedRecipeId = useRef<number | null>(null);
  const userName = session?.user?.name?.trim() || '사용자';

  const {
    data: recipe,
    isLoading: isRecipeLoading,
    isError: isRecipeError,
  } = useQuery<RecipeDetail>({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) throw new Error('Failed to fetch recipe detail');
      const json = await res.json();
      return json.data;
    },
    enabled: isValidRecipeId,
  });

  const {
    data: logs,
    isLoading: isLogsLoading,
    isError: isLogsError,
  } = useQuery<CookingLog[]>({
    queryKey: ['recipe-logs', recipeId],
    queryFn: async () => {
      const res = await fetch(`/api/recipes/${recipeId}/logs`);
      if (!res.ok) throw new Error('Failed to fetch cooking logs');
      const json = await res.json();
      if (!json || !json.data) throw new Error('Invalid logs data');
      return json.data;
    },
    enabled: isValidRecipeId,
  });

  useEffect(() => {
    if (recipe && recipe.base_servings && initializedRecipeId.current !== recipe.recipe_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setServings(recipe.base_servings);
      initializedRecipeId.current = recipe.recipe_id;
    }
  }, [recipe]);

  if (!isValidRecipeId) {
    return (
      <div className="max-w-[1000px] flex justify-center items-center h-[500px] text-[#EF4444]">
        잘못된 접근입니다.
      </div>
    );
  }

  if (isRecipeLoading || isLogsLoading) {
    return (
      <div className="max-w-[1000px] flex justify-center items-center h-[500px] text-[#A59A94]">
        로딩 중...
      </div>
    );
  }

  if (isRecipeError || isLogsError || !recipe) {
    return (
      <div className="max-w-[1000px] flex justify-center items-center h-[500px] text-[#EF4444]">
        데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  const logsData = logs || [];

  return (
    <div className="max-w-[1000px] pb-20 relative">
      <ArchiveDetailHeader title={recipe.title} cookCount={logsData.length} />

      <TabMenu
        recipeId={recipe.recipe_id}
        activeTab={activeTab}
        cookCount={logsData.length}
        onTabChange={setActiveTab}
        currentServings={servings}
      />

      {activeTab === 'overview' ? (
        <OverviewTab
          recipe={recipe}
          userName={userName}
          currentServings={servings}
          onServingsChange={setServings}
        />
      ) : (
        <GrowthLogTab logs={logsData} cookCount={logsData.length} />
      )}
    </div>
  );
}
