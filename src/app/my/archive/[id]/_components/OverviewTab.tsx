import { Minus, Plus } from 'lucide-react';

interface OverviewTabProps {
  recipe: {
    recipe_id: number;
    base_servings: number;
    latest_log: {
      status: 'SUCCESS' | 'REGRET' | 'FAIL';
      lesson_note: string | null;
      cooked_at: string;
    } | null;
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
  };
  currentServings: number;
  onServingsChange: (val: number) => void;
}

export default function OverviewTab({
  recipe,
  currentServings,
  onServingsChange,
}: OverviewTabProps) {
  const incrementServings = () => onServingsChange(currentServings + 1);
  const decrementServings = () => onServingsChange(currentServings > 1 ? currentServings - 1 : 1);

  const calculateDisplayAmount = (amount: number | null): string | number => {
    if (amount === null) return '';
    const ratio = currentServings / (recipe.base_servings || 1);
    const calculated = amount * ratio;

    if (calculated === 0) return 0;

    const integerPart = Math.floor(calculated);
    const fractionalPart = calculated - integerPart;

    if (fractionalPart < 0.01) return integerPart;

    return parseFloat(calculated.toFixed(1));
  };

  let alertBg = 'bg-[#FFFBE6]';
  let alertBorder = 'border-[#FFE58F]';
  let alertText = 'text-[#F59E0B]';
  let emoji = '💡';
  let label = '아쉬움';

  if (recipe.latest_log) {
    if (recipe.latest_log.status === 'FAIL') {
      alertBg = 'bg-[#FFF4F4]';
      alertBorder = 'border-[#FFBABA]';
      alertText = 'text-[#EF4444]';
      emoji = '⚠️';
      label = '실패';
    } else if (recipe.latest_log.status === 'SUCCESS') {
      alertBg = 'bg-[#F0FDF4]';
      alertBorder = 'border-[#BBF7D0]';
      alertText = 'text-[#4CAF50]';
      emoji = '🤩';
      label = '성공';
    } else {
      emoji = '🥺';
      label = '아쉬움';
    }
  }

  const dateStr = recipe.latest_log
    ? `${new Date(recipe.latest_log.cooked_at).getFullYear()}.${String(new Date(recipe.latest_log.cooked_at).getMonth() + 1).padStart(2, '0')}.${String(new Date(recipe.latest_log.cooked_at).getDate()).padStart(2, '0')}`
    : '';

  return (
    <>
      {/* Alert / Lesson Note */}
      {recipe.latest_log && recipe.latest_log.lesson_note && (
        <div className={`border ${alertBorder} ${alertBg} rounded-[16px] p-5 mb-8 opacity-90`}>
          <div className={`flex items-center gap-1.5 text-[14px] font-bold ${alertText} mb-2`}>
            <span>{emoji} </span> 지난번 루시님의 메모 (가장 최근)
            <span className="text-[#A59A94] font-normal ml-1">
              | {dateStr} · {emoji} {label}
            </span>
          </div>
          <div className="text-[15px] text-[#554A43]">
            &quot;{recipe.latest_log.lesson_note}&quot;
          </div>
        </div>
      )}

      <div className="flex gap-6 h-[500px]">
        {/* Ingredients Block */}
        <div className="flex-1 bg-white rounded-[24px] p-8 shadow-sm flex flex-col h-full overflow-hidden">
          {/* Header & Serving Controls */}
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-[18px] font-bold text-[#3C2D23]">재료</h2>
            <div className="flex items-center gap-3 bg-[#FAF6E9] rounded-full px-3 py-1.5">
              <button
                onClick={decrementServings}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#8C827A] hover:text-[#FF5A28] shadow-sm transition-colors"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span className="text-[#3C2D23] font-bold text-[14px] w-12 text-center">
                {currentServings}인분
              </span>
              <button
                onClick={incrementServings}
                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#8C827A] hover:text-[#FF5A28] shadow-sm transition-colors"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Ingredients List */}
          <ul className="text-[15px] text-[#554A43] space-y-4 overflow-y-auto flex-1 pr-2">
            {recipe.ingredients.map((ing) => (
              <li
                key={ing.ri_id}
                className="flex justify-between items-center py-2 border-b border-dashed border-gray-200 last:border-0"
              >
                <span className="font-semibold">{ing.name}</span>
                <span className="text-[#FF5A28] font-bold">
                  {calculateDisplayAmount(ing.amount)}
                  <span className="text-[13px] ml-1 text-[#8C827A] font-medium">
                    {ing.unit ? ing.unit : ''}
                  </span>
                </span>
              </li>
            ))}
            {recipe.ingredients.length === 0 && (
              <li className="text-gray-400 py-4 text-center">등록된 재료가 없습니다.</li>
            )}
          </ul>
        </div>

        {/* Instructions Block */}
        <div className="flex-2 bg-white rounded-[24px] p-8 shadow-sm flex flex-col relative overflow-hidden">
          <h2 className="text-[18px] font-bold text-[#3C2D23] mb-6 shrink-0">조리 순서</h2>
          <ol className="text-[15px] text-[#554A43] space-y-6 flex-1 overflow-y-auto pb-6 pr-4">
            {recipe.steps.map((step) => (
              <li key={step.step_id} className="flex">
                <span className="mr-3 font-semibold text-[#8C827A]">{step.step_order}.</span>
                <span className="leading-relaxed">{step.instruction}</span>
              </li>
            ))}
            {recipe.steps.length === 0 && (
              <li className="text-gray-400 py-4 text-center">등록된 조리 순서가 없습니다.</li>
            )}
          </ol>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-white to-transparent pointer-events-none rounded-b-[24px]" />
        </div>
      </div>
    </>
  );
}
