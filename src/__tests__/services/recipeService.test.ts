import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as recipeService from '@/services/recipeService';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    recipes: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('recipeService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('upsertRecipe', () => {
    test('신규 생성 시 재료 amount를 normalize 하고 name/unit trim을 유지한다', async () => {
      vi.mocked(prisma.recipes.create).mockResolvedValue({
        recipe_id: 101,
        title: '파스타',
      } as never);

      await recipeService.upsertRecipe(1, {
        title: ' 파스타 ',
        servings: 2,
        difficulty: 'Easy',
        source_url: null,
        thumbnail_url: null,
        ingredients: [
          { name: ' 설탕 ', amount: '1.5', unit: ' tsp ' },
          { name: ' 우유 ', amount: '  ', unit: ' ml ' },
          { name: ' 소금 ', amount: undefined as unknown as number, unit: undefined },
          { name: ' 버터 ', amount: '1~2', unit: ' 큰술 ' },
        ],
        steps: [{ step_order: 1, instruction: ' 끓인다. ' }],
      });

      expect(prisma.recipes.create).toHaveBeenCalledTimes(1);

      const callArg = vi.mocked(prisma.recipes.create).mock.calls[0][0];
      expect(callArg.data.title).toBe('파스타');
      expect(callArg.data.recipe_ingredients.create).toEqual([
        { name: '설탕', amount: 1.5, unit: 'tsp' },
        { name: '우유', amount: null, unit: 'ml' },
        { name: '소금', amount: null, unit: null },
        { name: '버터', amount: 1.5, unit: '큰술' },
      ]);
    });
  });
});
