import { expect, test, describe, vi, beforeEach } from 'vitest';
import { GET as getRecipes } from '@/app/api/recipes/route';
import { GET as getRecipeDetail } from '@/app/api/recipes/[recipe_id]/route';
import { GET as getRecipeSteps } from '@/app/api/recipes/[recipe_id]/steps/route';
import { GET as getRecipeLogs } from '@/app/api/recipes/[recipe_id]/logs/route';

// ─────────────────────────────────────────────
// 모킹
// ─────────────────────────────────────────────
const { mockGetServerSession } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));

const {
  mockRecipesFindMany,
  mockLogsFindMany,
  mockRecipesFindUnique,
  mockStepsFindMany,
  mockLogsFindManyForRecipe,
} = vi.hoisted(() => ({
  mockRecipesFindMany: vi.fn(),
  mockLogsFindMany: vi.fn(),
  mockRecipesFindUnique: vi.fn(),
  mockStepsFindMany: vi.fn(),
  mockLogsFindManyForRecipe: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    recipes: {
      findMany: mockRecipesFindMany,
      findUnique: mockRecipesFindUnique,
    },
    cooking_logs: {
      findMany: mockLogsFindMany,
    },
    recipe_steps: {
      findMany: mockStepsFindMany,
    },
  },
}));

const MOCK_SESSION = { user: { id: '1', name: '루시' } };
const mockParams = (recipeId: string) => ({
  params: Promise.resolve({ recipe_id: recipeId }),
});

// ─────────────────────────────────────────────
// GET /api/recipes
// ─────────────────────────────────────────────
describe('GET /api/recipes', () => {
  beforeEach(() => vi.clearAllMocks());

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await getRecipes();
    expect(res.status).toBe(401);
  });

  test('stats(total_cooking_count, overall_success_rate)와 data를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindMany.mockResolvedValueOnce([
      {
        recipe_id: 1,
        title: '김치찌개',
        thumbnail_url: null,
        difficulty: 'Easy',
        servings: 2,
        created_at: new Date(),
        cooking_logs: [
          { log_id: 1, status: 'SUCCESS', lesson_note: '맛있었다', cooked_at: new Date() },
        ],
      },
    ]);
    mockLogsFindMany.mockResolvedValueOnce([{ status: 'SUCCESS' }, { status: 'FAIL' }]);

    const res = await getRecipes();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stats.total_cooking_count).toBe(2);
    expect(body.stats.overall_success_rate).toBe(50);
    expect(body.data[0].recipe_id).toBe(1);
    expect(body.data[0].latest_log).not.toBeNull();
  });

  test('로그가 없으면 overall_success_rate가 null', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindMany.mockResolvedValueOnce([]);
    mockLogsFindMany.mockResolvedValueOnce([]);

    const res = await getRecipes();
    const body = await res.json();

    expect(body.stats.overall_success_rate).toBeNull();
  });
});

// ─────────────────────────────────────────────
// GET /api/recipes/[recipe_id]
// ─────────────────────────────────────────────
describe('GET /api/recipes/[recipe_id]', () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = (servings?: number) =>
    new Request(`http://localhost/api/recipes/1${servings ? `?servings=${servings}` : ''}`);

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await getRecipeDetail(makeReq(), mockParams('1'));
    expect(res.status).toBe(401);
  });

  test('존재하지 않는 레시피이면 404', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce(null);
    const res = await getRecipeDetail(makeReq(), mockParams('99'));
    expect(res.status).toBe(404);
  });

  test('servings 배율 적용: 2인분 기준 4인분 요청 시 수량 2배', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce({
      recipe_id: 1,
      user_id: 1,
      title: '김치찌개',
      source_url: null,
      thumbnail_url: null,
      difficulty: 'Easy',
      servings: 2,
      created_at: new Date(),
      recipe_ingredients: [{ ri_id: 1, name: '김치', amount: '200', unit: 'g' }],
      recipe_steps: [],
      cooking_logs: [],
    });

    const res = await getRecipeDetail(makeReq(4), mockParams('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.requested_servings).toBe(4);
    expect(body.data.ingredients[0].amount).toBe(400); // 200g * 2
  });
});

// ─────────────────────────────────────────────
// GET /api/recipes/[recipe_id]/steps
// ─────────────────────────────────────────────
describe('GET /api/recipes/[recipe_id]/steps', () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = () => new Request('http://localhost/api/recipes/1/steps');

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await getRecipeSteps(makeReq(), mockParams('1'));
    expect(res.status).toBe(401);
  });

  test('존재하지 않는 레시피이면 404', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce(null);
    const res = await getRecipeSteps(makeReq(), mockParams('99'));
    expect(res.status).toBe(404);
  });

  test('step_order, instruction, timer_seconds만 반환', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce({ recipe_id: 1 });
    mockStepsFindMany.mockResolvedValueOnce([
      { step_id: 1, step_order: 1, instruction: '물을 끓입니다.', timer_seconds: 300 },
    ]);

    const res = await getRecipeSteps(makeReq(), mockParams('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0]).toHaveProperty('step_order');
    expect(body.data[0]).toHaveProperty('instruction');
    expect(body.data[0]).toHaveProperty('timer_seconds');
  });
});

// ─────────────────────────────────────────────
// GET /api/recipes/[recipe_id]/logs
// ─────────────────────────────────────────────
describe('GET /api/recipes/[recipe_id]/logs', () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = () => new Request('http://localhost/api/recipes/1/logs');

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await getRecipeLogs(makeReq(), mockParams('1'));
    expect(res.status).toBe(401);
  });

  test('존재하지 않는 레시피이면 404', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce(null);
    const res = await getRecipeLogs(makeReq(), mockParams('99'));
    expect(res.status).toBe(404);
  });

  test('해당 레시피의 요리 기록 목록 반환', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce({ recipe_id: 1 });
    mockLogsFindManyForRecipe.mockResolvedValueOnce([]);
    // cooking_logs.findMany 는 mockLogsFindMany 로 대체됨
    mockLogsFindMany.mockResolvedValueOnce([
      {
        log_id: 1,
        status: 'SUCCESS',
        lesson_note: '맛있었다',
        companion: null,
        cooked_at: new Date(),
      },
    ]);

    const res = await getRecipeLogs(makeReq(), mockParams('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].status).toBe('SUCCESS');
  });
});
