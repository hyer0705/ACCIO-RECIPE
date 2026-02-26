import { expect, test, describe, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/recipes/route';

// ─────────────────────────────────────────────
// 1. next-auth 세션 모킹
// ─────────────────────────────────────────────
const { mockGetServerSession } = vi.hoisted(() => {
  return { mockGetServerSession: vi.fn() };
});

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

// ─────────────────────────────────────────────
// 2. Prisma 모킹
// ─────────────────────────────────────────────
const { mockRecipesCreate } = vi.hoisted(() => {
  return { mockRecipesCreate: vi.fn() };
});

vi.mock('@/lib/prisma', () => ({
  default: {
    recipes: {
      create: mockRecipesCreate,
    },
  },
}));

// ─────────────────────────────────────────────
// authOptions 모킹 (getServerSession 인자로 전달되므로 빈 객체로 충분)
// ─────────────────────────────────────────────
vi.mock('@/lib/authOptions', () => ({
  authOptions: {},
}));

// ─────────────────────────────────────────────
// 테스트 헬퍼
// ─────────────────────────────────────────────
const VALID_BODY = {
  title: '국물 떡볶이',
  servings: 2,
  difficulty: 'Easy',
  source_url: 'https://youtube.com/watch?v=test',
  thumbnail_url: 'https://img.youtube.com/vi/test/maxresdefault.jpg',
  ingredients: [
    { name: '떡볶이 떡', amount: 400, unit: 'g' },
    { name: '고추장', amount: 2.5, unit: '스푼' },
  ],
  steps: [
    { step_order: 1, instruction: '물 500ml와 육수팩을 넣고 끓입니다.', timer_seconds: 0 },
    { step_order: 2, instruction: '양념장 재료를 비율대로 섞어 준비합니다.', timer_seconds: 0 },
  ],
};

const createRequest = (body: unknown) =>
  new Request('http://localhost:3000/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const MOCK_SESSION = {
  user: { id: '1', name: '루시', email: 'lucy@test.com' },
};

describe('POST /api/recipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 인증 ──────────────────────────────────

  test('세션이 없으면 401 에러를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await POST(createRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('인증이 필요합니다.');
  });

  // ── Validation ────────────────────────────

  test('title이 없으면 400 에러를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const body = { ...VALID_BODY, title: '' };
    const res = await POST(createRequest(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toContain('레시피 제목(title)이 필요합니다.');
  });

  test('ingredients 배열이 비어있으면 400 에러를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const body = { ...VALID_BODY, ingredients: [] };
    const res = await POST(createRequest(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toContain('최소 1개 이상의 재료(ingredients)가 필요합니다.');
  });

  test('ingredients 항목 중 name이 없으면 400 에러를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const body = {
      ...VALID_BODY,
      ingredients: [{ name: '', amount: 400, unit: 'g' }],
    };
    const res = await POST(createRequest(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toContain('재료[0]에 이름(name)이 누락되었습니다.');
  });

  test('steps 배열이 비어있으면 400 에러를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const body = { ...VALID_BODY, steps: [] };
    const res = await POST(createRequest(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toContain('최소 1개 이상의 조리 순서(steps)가 필요합니다.');
  });

  test('steps 항목 중 instruction이 없으면 400 에러를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const body = {
      ...VALID_BODY,
      steps: [{ step_order: 1, instruction: '' }],
    };
    const res = await POST(createRequest(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toContain('조리 순서[0]에 설명(instruction)이 누락되었습니다.');
  });

  // ── 성공 케이스 ───────────────────────────

  test('정상 요청 시 201로 생성된 recipe_id와 title을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesCreate.mockResolvedValueOnce({ recipe_id: 42, title: '국물 떡볶이' });

    const res = await POST(createRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.recipe_id).toBe(42);
    expect(data.data.title).toBe('국물 떡볶이');
  });

  test('정상 요청 시 prisma.recipes.create가 올바른 인자로 호출된다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesCreate.mockResolvedValueOnce({ recipe_id: 42, title: '국물 떡볶이' });

    await POST(createRequest(VALID_BODY));

    expect(mockRecipesCreate).toHaveBeenCalledTimes(1);

    const callArg = mockRecipesCreate.mock.calls[0][0];
    expect(callArg.data.user_id).toBe(1); // session.user.id "1" → parseInt → 1
    expect(callArg.data.title).toBe('국물 떡볶이');
    expect(callArg.data.servings).toBe(2);
    expect(callArg.data.difficulty).toBe('Easy');
    expect(callArg.data.recipe_ingredients.create).toHaveLength(2);
    expect(callArg.data.recipe_steps.create).toHaveLength(2);
  });

  // ── 서버 에러 ─────────────────────────────

  test('Prisma가 에러를 던지면 500을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesCreate.mockRejectedValueOnce(new Error('DB 연결 실패'));

    const res = await POST(createRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('서버 에러가 발생했습니다.');
  });
});
