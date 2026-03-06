import { CookingStep, RecipeIngredient } from '@/types/recipe';

interface StepIngredientChipsProps {
  step: CookingStep;
}

export default function StepIngredientChips({ step }: StepIngredientChipsProps) {
  const ingredients = step.step_ingredients || [];

  if (ingredients.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {ingredients.map((ing, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 bg-[#4B3A32] border border-[#FF5A28]/60 rounded-2xl px-4 py-3"
        >
          <span className="text-white font-semibold text-base">{ing.name}</span>
          {ing.amount != null && (
            <span className="text-[#FF5A28] font-black text-lg leading-none">
              {ing.amount}
              <span className="text-sm font-medium text-gray-400 ml-0.5">{ing.unit ?? ''}</span>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
