import prisma from '@/lib/prisma';

export async function getRecipeForCooking(recipeId: number) {
  return await prisma.recipes.findUnique({
    where: { recipe_id: recipeId },
    include: {
      recipe_steps: {
        orderBy: { step_order: 'asc' },
      },
      recipe_ingredients: true,
    },
  });
}
