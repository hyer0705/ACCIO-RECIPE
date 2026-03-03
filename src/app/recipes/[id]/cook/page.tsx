import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import CookingStepViewerClient from './CookingStepViewerClient';

export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const recipeId = parseInt(resolvedParams.id, 10);

  if (isNaN(recipeId)) {
    notFound();
  }

  const recipe = await prisma.recipes.findUnique({
    where: { recipe_id: recipeId },
    include: {
      recipe_steps: {
        orderBy: { step_order: 'asc' },
      },
    },
  });

  if (!recipe) {
    notFound();
  }

  return (
    <div className="fixed inset-0 bg-[#3C2D23] z-50 flex flex-col items-center justify-center overflow-auto">
      <CookingStepViewerClient recipeId={recipe.recipe_id} steps={recipe.recipe_steps} />
    </div>
  );
}
