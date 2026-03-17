import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as recipeService from '@/services/recipeService';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    recipes: {
      findUnique: vi.fn(),
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

    test('기존 레시피 수정 시 소유자가 아니면 FORBIDDEN을 던지고 update를 실행하지 않는다', async () => {
      const update = vi.fn();
      const deleteManyIngredients = vi.fn();
      const createManyIngredients = vi.fn();
      const deleteManySteps = vi.fn();
      const createManySteps = vi.fn();

      vi.mocked(prisma.recipes.findUnique).mockResolvedValue({ user_id: 2 } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
        callback({
          recipes: {
            update,
          },
          recipe_ingredients: {
            deleteMany: deleteManyIngredients,
            createMany: createManyIngredients,
          },
          recipe_steps: {
            deleteMany: deleteManySteps,
            createMany: createManySteps,
          },
        } as never),
      );

      await expect(
        recipeService.upsertRecipe(1, {
          recipe_id: 7,
          title: '된장찌개',
          servings: 2,
          difficulty: 'Easy',
          source_url: null,
          thumbnail_url: null,
          ingredients: [{ name: '된장' }],
          steps: [{ step_order: 1, instruction: '끓인다.' }],
        }),
      ).rejects.toThrow('수정 권한이 없습니다.');

      expect(prisma.recipes.findUnique).toHaveBeenCalledWith({
        where: { recipe_id: 7 },
        select: { user_id: true },
      });
      expect(update).not.toHaveBeenCalled();
      expect(deleteManyIngredients).not.toHaveBeenCalled();
      expect(createManyIngredients).not.toHaveBeenCalled();
      expect(deleteManySteps).not.toHaveBeenCalled();
      expect(createManySteps).not.toHaveBeenCalled();
    });

    test('기존 레시피 수정 시 user_id를 변경하지 않는다', async () => {
      const update = vi.fn().mockResolvedValue({ recipe_id: 7, title: '된장찌개' });

      vi.mocked(prisma.recipes.findUnique).mockResolvedValue({ user_id: 1 } as never);

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
        callback({
          recipes: {
            update,
          },
          recipe_ingredients: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
          },
          recipe_steps: {
            deleteMany: vi.fn(),
            createMany: vi.fn(),
          },
        } as never),
      );

      await recipeService.upsertRecipe(1, {
        recipe_id: 7,
        title: ' 된장찌개 ',
        servings: 2,
        difficulty: 'Easy',
        source_url: null,
        thumbnail_url: null,
        ingredients: [],
        steps: [],
      });

      expect(update).toHaveBeenCalledTimes(1);
      const callArg = update.mock.calls[0][0];
      expect(callArg.where).toEqual({ recipe_id: 7 });
      expect(callArg.data).not.toHaveProperty('user_id');
      expect(callArg.data.title).toBe('된장찌개');
    });
  });

  describe('getRecipeDetail', () => {
    test('다른 사용자의 레시피면 null을 반환한다', async () => {
      vi.mocked(prisma.recipes.findUnique).mockResolvedValue({
        recipe_id: 7,
        user_id: 2,
        title: '된장찌개',
        source_url: null,
        thumbnail_url: null,
        difficulty: 'Easy',
        servings: 2,
        status: 'COMPLETED',
        errorReason: null,
        created_at: new Date(),
        recipe_ingredients: [],
        recipe_steps: [],
        cooking_logs: [],
      } as never);

      const recipe = await recipeService.getRecipeDetail(7, 1);

      expect(recipe).toBeNull();
    });

    test('recipe.servings가 0 이하면 1로 보정해 배율 계산한다', async () => {
      vi.mocked(prisma.recipes.findUnique).mockResolvedValue({
        recipe_id: 7,
        user_id: 1,
        title: '된장찌개',
        source_url: null,
        thumbnail_url: null,
        difficulty: 'Easy',
        servings: 0,
        status: 'COMPLETED',
        errorReason: null,
        created_at: new Date(),
        recipe_ingredients: [{ ri_id: 1, name: '된장', amount: '2', unit: 'tbsp' }],
        recipe_steps: [],
        cooking_logs: [],
      } as never);

      const recipe = await recipeService.getRecipeDetail(7, 1, 3);

      expect(recipe).not.toBeNull();
      expect(recipe?.base_servings).toBe(1);
      expect(recipe?.requested_servings).toBe(3);
      expect(recipe?.ingredients[0].amount).toBe(6);
    });
  });
});
