'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus, Edit2, Check } from 'lucide-react';
import { ExtractedRecipeData } from '@/store/useRecipeStore';
import { useSaveRecipe } from '@/hooks/useSaveRecipe';
import { calculateDisplayAmount } from '@/lib/recipe/utils';

interface RecipePreviewProps {
  data: ExtractedRecipeData;
}

export default function RecipePreview({ data }: RecipePreviewProps) {
  const router = useRouter();
  // 상태: 사용자가 조절할 수 있는 인원 수
  const [currentServings, setCurrentServings] = useState(data.servings || 1);
  const [isEditing, setIsEditing] = useState(false);
  const [editedIngredients, setEditedIngredients] = useState(data.ingredients);
  const [editedSteps, setEditedSteps] = useState(data.steps);

  const { isPending: isSaving } = useSaveRecipe(currentServings);

  const incrementServings = () => setCurrentServings((prev) => prev + 1);
  const decrementServings = () => setCurrentServings((prev) => (prev > 1 ? prev - 1 : 1));

  const handleStartCooking = () => {
    // 사용자가 수정을 하나도 안 했다면 바로 이동 (서버에 이미 COMPLETED 상태로 저장되어 있음)
    // 수정을 했다면 저장을 하고 이동해야 하지만, 유저 요청에 따라 '로직 제거'를 우선 적용
    // 나중에 '저장 후 시작' 버튼을 따로 만들거나 할 수 있음
    const url = `/recipes/${data.recipe_id}/cook${currentServings ? `?servings=${currentServings}` : ''}`;
    router.push(url);
  };

  const displayTitle =
    data.title && data.title !== '이름 모를 레시피'
      ? `${data.title} | 레시피 분석 리포트`
      : '레시피 분석 리포트';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b-4 border-yellow-400 pb-2 shrink-0">
        <h1 className="text-3xl font-bold text-[#3C2D23]">{displayTitle}</h1>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm font-bold text-[#FF5A28] hover:bg-gray-50 transition-colors cursor-pointer"
        >
          {isEditing ? (
            <>
              <Check size={16} /> 수정 완료
            </>
          ) : (
            <>
              <Edit2 size={16} /> 레시피 직접 수정
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden pb-4">
        {/* 왼쪽: 재료 목록 */}
        <section className="bg-white rounded-[2rem] p-8 shadow-sm relative flex flex-col h-full overflow-hidden">
          <h2 className="text-xl font-bold text-[#3C2D23] mb-6 shrink-0">최적화된 재료</h2>
          <div className="overflow-y-auto flex-1 pr-2 pb-8">
            <ul className="space-y-4">
              {editedIngredients.map(
                (
                  ingredient: { name: string; amount: number | null; unit: string | null },
                  idx: number,
                ) => (
                  <li
                    key={idx}
                    className={`flex justify-between items-center py-4 px-6 bg-[#FAF6E9] rounded-2xl ${isEditing ? 'flex-col gap-3 items-start' : ''}`}
                  >
                    {isEditing ? (
                      <>
                        <div className="flex w-full items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 w-12">재료명</span>
                          <input
                            title="재료명"
                            type="text"
                            value={ingredient.name}
                            onChange={(e) => {
                              const newIngs = [...editedIngredients];
                              newIngs[idx].name = e.target.value;
                              setEditedIngredients(newIngs);
                            }}
                            className="flex-1 p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-[#FF5A28]/50 bg-white"
                          />
                        </div>
                        <div className="flex w-full items-center gap-2">
                          <span className="text-xs font-bold text-gray-500 w-12">수량</span>
                          <input
                            title="수량"
                            type="number"
                            value={ingredient.amount ?? ''}
                            onChange={(e) => {
                              const newIngs = [...editedIngredients];
                              newIngs[idx].amount = e.target.value
                                ? parseFloat(e.target.value)
                                : null;
                              setEditedIngredients(newIngs);
                            }}
                            className="w-1/3 p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-[#FF5A28]/50 bg-white"
                          />
                          <input
                            title="단위"
                            type="text"
                            value={ingredient.unit ?? ''}
                            onChange={(e) => {
                              const newIngs = [...editedIngredients];
                              newIngs[idx].unit = e.target.value;
                              setEditedIngredients(newIngs);
                            }}
                            placeholder="단위(g, 큰술 등)"
                            className="flex-1 p-2 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-[#FF5A28]/50 bg-white"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-[#3C2D23]">{ingredient.name}</span>
                        <span className="font-bold text-[#FF5A28]">
                          {calculateDisplayAmount(
                            ingredient.amount,
                            currentServings,
                            data.servings,
                          )}
                          <span className="text-sm ml-1">{ingredient.unit}</span>
                        </span>
                      </>
                    )}
                  </li>
                ),
              )}
            </ul>
          </div>
          {/* 하단 스크롤 그라데이션 */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-[2rem]" />
        </section>

        {/* 오른쪽: 인원수 조절 + 순서 */}
        <section className="flex flex-col gap-6 h-full overflow-hidden">
          {/* 인원수 조절 카드 */}
          <div className="bg-[#4A3B32] rounded-[2rem] p-6 text-white flex flex-col justify-center relative overflow-hidden">
            <h3 className="text-sm text-white/80 font-medium mb-4">인원수 조절</h3>
            <div className="flex items-center justify-between bg-[#5B4A40] rounded-full p-2 relative z-10">
              <button
                onClick={decrementServings}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                disabled={isEditing}
              >
                <Minus size={20} />
              </button>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-[#FF9E00]">{currentServings}</span>
                <span className="text-lg font-medium">인분</span>
              </div>
              <button
                onClick={incrementServings}
                className="w-10 h-10 rounded-full bg-[#FF5A28] flex items-center justify-center hover:bg-[#ff460f] transition-colors cursor-pointer"
                disabled={isEditing}
              >
                <Plus size={20} />
              </button>
            </div>
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  수정 모드에선 조절할 수 없습니다
                </span>
              </div>
            )}
          </div>

          {/* 레시피 미리보기 카드 */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm flex-1 relative flex flex-col overflow-hidden">
            <h2 className="text-xl font-bold text-[#3C2D23] mb-6 shrink-0">최종 레시피 확인하기</h2>
            <div className="overflow-y-auto flex-1 pr-2 pb-8">
              <ol className="space-y-6">
                {editedSteps.map(
                  (step: { step_order: number; instruction: string }, idx: number) => (
                    <li key={step.step_order} className="flex gap-4">
                      <span className="text-[#FF5A28] font-bold mt-0.5">{step.step_order}.</span>
                      {isEditing ? (
                        <textarea
                          title="조리 순서"
                          value={step.instruction}
                          onChange={(e) => {
                            const newSteps = [...editedSteps];
                            newSteps[idx].instruction = e.target.value;
                            setEditedSteps(newSteps);
                          }}
                          className="w-full p-3 rounded-lg border border-gray-300 text-sm whitespace-pre-line outline-none focus:ring-2 focus:ring-[#FF5A28]/50"
                          rows={3}
                        />
                      ) : (
                        <p className="text-[#3C2D23] text-sm leading-relaxed whitespace-pre-line">
                          {step.instruction}
                        </p>
                      )}
                    </li>
                  ),
                )}
              </ol>
            </div>
            {/* 하단 스크롤 그라데이션 */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-[2rem]" />
          </div>

          {/* 저장 및 요리 시작 버튼 */}
          <button
            onClick={handleStartCooking}
            disabled={isSaving || isEditing}
            className="w-full h-16 rounded-[2rem] bg-[#FF5A28] text-white font-bold text-lg shadow-md hover:bg-[#ff460f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
          >
            {isEditing ? '수정을 완료해주세요' : isSaving ? '저장 중...' : '요리 시작하기'}
          </button>
        </section>
      </div>
    </div>
  );
}
