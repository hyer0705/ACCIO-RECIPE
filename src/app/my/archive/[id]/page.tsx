'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import React from 'react';

interface RecipeDetail {
  recipe_id: number;
  title: string;
  latest_log: {
    log_id: number;
    status: 'SUCCESS' | 'REGRET' | 'FAIL';
    lesson_note: string;
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

export default function MyArchiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const recipeId = unwrappedParams.id;

  const {
    data: recipe,
    isLoading,
    isError,
  } = useQuery<RecipeDetail>({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const res = await fetch(`/api/recipes/${recipeId}`);
      if (!res.ok) throw new Error('Failed to fetch recipe detail');
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-[1000px] flex justify-center items-center h-64 text-[#A59A94]">
        로딩 중...
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div className="max-w-[1000px] flex justify-center items-center h-64 text-[#EF4444]">
        데이터를 불러오는데 실패했습니다.
      </div>
    );
  }

  // lesson note UI styles
  let alertBg = 'bg-[#FFFBE6]';
  let alertBorder = 'border-[#FFE58F]';
  let alertText = 'text-[#F59E0B]';
  let emoji = '💡';

  if (recipe.latest_log) {
    if (recipe.latest_log.status === 'FAIL') {
      alertBg = 'bg-[#FFF4F4]';
      alertBorder = 'border-[#FFBABA]';
      alertText = 'text-[#EF4444]';
      emoji = '⚠️';
    } else if (recipe.latest_log.status === 'SUCCESS') {
      alertBg = 'bg-[#F0FDF4]';
      alertBorder = 'border-[#BBF7D0]';
      alertText = 'text-[#4CAF50]';
      emoji = '🤩';
    }
  }

  return (
    <div className="max-w-[1000px]">
      <h1 className="text-[28px] font-bold text-[#3C2D23] mb-6">{recipe.title}</h1>

      {/* Alert / Lesson Note */}
      {recipe.latest_log && recipe.latest_log.lesson_note && (
        <div className={`border ${alertBorder} ${alertBg} rounded-[20px] p-6 mb-8`}>
          <div className={`flex items-center gap-1.5 text-sm font-bold ${alertText} mb-2`}>
            <span>{emoji}</span> 지난번 루시님의 메모
          </div>
          <div className="text-[15px] text-[#3C2D23]">
            &quot;{recipe.latest_log.lesson_note}&quot;
          </div>
        </div>
      )}

      <div className="flex gap-6 h-[480px]">
        {/* Ingredients Block */}
        <div className="flex-1 bg-white rounded-[20px] p-8 shadow-sm overflow-y-auto">
          <h2 className="text-[18px] font-bold text-[#3C2D23] mb-6">
            재료 ({recipe.base_servings}인분)
          </h2>
          <ul className="text-[15px] text-[#554A43] space-y-4">
            {recipe.ingredients.map((ing) => (
              <li key={ing.ri_id} className="flex items-center before:content-['-'] before:mr-2">
                {ing.name} {ing.amount !== null ? ing.amount : ''}
                {ing.unit ? ing.unit : ''}
              </li>
            ))}
            {recipe.ingredients.length === 0 && (
              <li className="text-gray-400">등록된 재료가 없습니다.</li>
            )}
          </ul>
        </div>

        {/* Instructions Block */}
        <div className="flex-[2] bg-white rounded-[20px] p-8 shadow-sm flex flex-col relative overflow-hidden">
          <h2 className="text-[18px] font-bold text-[#3C2D23] mb-6">조리 순서</h2>
          <ol className="text-[15px] text-[#554A43] space-y-5 flex-1 overflow-y-auto pb-20 pr-4">
            {recipe.steps.map((step) => (
              <li key={step.step_id} className="flex">
                <span className="mr-2">{step.step_order}.</span>
                <span>{step.instruction}</span>
              </li>
            ))}
            {recipe.steps.length === 0 && (
              <li className="text-gray-400">등록된 조리 순서가 없습니다.</li>
            )}
          </ol>

          {/* Cooking Button */}
          <div className="absolute bottom-6 right-6">
            <Link
              href={`/cooking/${recipe.recipe_id}`}
              className="inline-flex items-center justify-center bg-[#FF5A28] text-white px-10 py-4 rounded-full font-bold text-[16px] hover:bg-[#E04D20] transition-colors shadow-md"
            >
              이 레시피로 다시 요리하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
