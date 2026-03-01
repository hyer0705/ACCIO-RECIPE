'use client';

import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ExtractedRecipeData } from '@/store/useRecipeStore';
import { useSaveRecipe } from '@/hooks/useSaveRecipe';

interface RecipePreviewProps {
  data: ExtractedRecipeData;
}

export default function RecipePreview({ data }: RecipePreviewProps) {
  const { mutate: saveRecipe, isPending: isSaving } = useSaveRecipe();

  // 상태: 사용자가 조절할 수 있는 인원 수
  const [currentServings, setCurrentServings] = useState(data.servings || 1);

  const incrementServings = () => setCurrentServings((prev) => prev + 1);
  const decrementServings = () => setCurrentServings((prev) => (prev > 1 ? prev - 1 : 1));

  // 인원 수 변경에 따른 재료량 재계산 (간단한 비례 계산)
  const calculateAmount = (amount: number | null) => {
    if (amount === null) return '';
    const ratio = currentServings / (data.servings || 1);
    const calculated = amount * ratio;
    // 소수점 1자리까지만 보여주고, 정수면 정수만 표시
    return parseFloat(calculated.toFixed(1));
  };

  const handleStartCooking = () => {
    // 저장 전 인원수에 맞게 재료량 수정
    const finalDataToSave: ExtractedRecipeData = {
      ...data,
      servings: currentServings,
      ingredients: data.ingredients.map((ing) => ({
        ...ing,
        amount: ing.amount !== null ? (calculateAmount(ing.amount) as number) : null,
      })),
    };

    saveRecipe(finalDataToSave);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#3C2D23] mb-8 border-b-4 border-yellow-400 pb-2 inline-block">
        레시피 분석 리포트
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 왼쪽: 재료 목록 */}
        <section className="bg-white rounded-[2rem] p-8 shadow-sm">
          <h2 className="text-xl font-bold text-[#3C2D23] mb-6">최적화된 재료</h2>
          <ul className="space-y-4">
            {data.ingredients.map((ingredient, idx) => (
              <li
                key={idx}
                className="flex justify-between items-center py-4 px-6 bg-[#FAF6E9] rounded-2xl"
              >
                <span className="font-semibold text-[#3C2D23]">{ingredient.name}</span>
                <span className="font-bold text-[#FF5A28]">
                  {calculateAmount(ingredient.amount)}
                  <span className="text-sm ml-1">{ingredient.unit}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* 오른쪽: 인원수 조절 + 순서 */}
        <section className="flex flex-col gap-6">
          {/* 인원수 조절 카드 */}
          <div className="bg-[#4A3B32] rounded-[2rem] p-6 text-white flex flex-col justify-center">
            <h3 className="text-sm text-white/80 font-medium mb-4">인원수 조절</h3>
            <div className="flex items-center justify-between bg-[#5B4A40] rounded-full p-2">
              <button
                onClick={decrementServings}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <Minus size={20} />
              </button>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#FF9E00]">{currentServings}</span>
                <span className="text-lg font-medium">인분</span>
              </div>
              <button
                onClick={incrementServings}
                className="w-10 h-10 rounded-full bg-[#FF5A28] flex items-center justify-center hover:bg-[#ff460f] transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* 레시피 미리보기 카드 */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm flex-1">
            <h2 className="text-xl font-bold text-[#3C2D23] mb-6">레시피 미리보기</h2>
            <ol className="space-y-6">
              {data.steps.map((step) => (
                <li key={step.step_order} className="flex gap-4">
                  <span className="text-[#FF5A28] font-bold mt-0.5">{step.step_order}.</span>
                  <p className="text-[#3C2D23] text-sm leading-relaxed whitespace-pre-line">
                    {step.instruction}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* 저장 및 요리 시작 버튼 */}
          <button
            onClick={handleStartCooking}
            disabled={isSaving}
            className="w-full h-16 rounded-[2rem] bg-[#FF5A28] text-white font-bold text-lg shadow-md hover:bg-[#ff460f] transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isSaving ? '저장 중...' : '요리 시작하기'}
          </button>
        </section>
      </div>
    </div>
  );
}
