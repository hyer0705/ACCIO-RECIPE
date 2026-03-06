import { notFound } from 'next/navigation';
import { getRecipeForCooking } from '@/services/recipeService';
import { StepIngredientInfo } from '@/types/recipe';
import CookingStepViewerClient from '@/components/recipe/cook/CookingStepViewerClient';

export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipeId = Number(id);

  if (Number.isNaN(recipeId)) {
    notFound();
  }

  const recipe = await getRecipeForCooking(recipeId);

  if (!recipe) {
    notFound();
  }

  const serializedSteps = recipe.recipe_steps.map((step) => ({
    ...step,
    step_ingredients: step.step_ingredients as unknown as StepIngredientInfo[],
  }));

  return (
    <div className="fixed inset-0 bg-[#3C2D23] z-50 flex flex-col items-center justify-center overflow-auto">
      <CookingStepViewerClient recipeId={recipe.recipe_id} steps={serializedSteps} />
    </div>
  );
}
