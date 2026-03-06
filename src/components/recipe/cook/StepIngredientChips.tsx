import { CookingStep, RecipeIngredient } from '@/types/recipe';

interface StepIngredientChipsProps {
  step: CookingStep;
  allIngredients: RecipeIngredient[];
}

export default function StepIngredientChips({ step, allIngredients }: StepIngredientChipsProps) {
  const names = Array.isArray(step.step_ingredients) ? (step.step_ingredients as string[]) : [];
  const matched = names
    .map((name) => allIngredients.find((ing) => ing.name === name))
    .filter(Boolean) as RecipeIngredient[];

  if (matched.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {matched.map((ing) => (
        <div
          key={ing.ri_id}
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
