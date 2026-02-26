import { expect, test, describe, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/cooking-logs/route';

// ──────────────────────────────────────────────
// 1. next-auth 세션 모킹
// ──────────────────────────────────────────────
const { mockGetServerSession } = vi.hoisted(() => {
  return { mockGetServerSession: vi.fn() };
});

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

// ──────────────────────────────────────────────
// 2. Prisma 모킹
//    - recipes.findUnique   : recipe_id 존재 여부 검증
//    - cooking_logs.create  : 요리 기록 저장
// ──────────────────────────────────────────────
const { mockRecipesFindUnique, mockLogsCreate } = vi.hoisted(() => {
  return {
    mockRecipesFindUnique: vi.fn(),
    mockLogsCreate: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({
  default: {
    recipes: {
      findUnique: mockRecipesFindUnique,
    },
    cooking_logs: {
      create: mockLogsCreate,
    },
  },
}));

vi.mock('@/lib/authOptions', () => ({
  authOptions: {},
}));

// ──────────────────────────────────────────────
// 테스트 헬퍼
// ──────────────────────────────────────────────
const createRequest = (body: unknown) =>
  new Request('http://localhost:3000/api/cooking-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const MOCK_SESSION = {
  user: { id: '1', name: '루시', email: 'lucy@test.com' },
};

const MOCK_RECIPE = { recipe_id: 42 };

const MOCK_CREATED_LOG = {
  log_id: 1,
  recipe_id: 42,
  status: 'SUCCESS',
  lesson_note: '양파를 5분 더 볶으니 단맛이 확 살아남.',
  companion: '가족',
  cooked_at: new Date('2026-02-26T18:00:00Z'),
};

/** 정상 요청 기본 바디 */
const VALID_BODY = {
  status: 'SUCCESS',
  recipe_id: 42,
  lesson_note: '양파를 5분 더 볶으니 단맛이 확 살아남.',
};

// ──────────────────────────────────────────────
describe('POST /api/logs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 인증 ────────────────────────────────────

  test('세션이 없으면 401을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await POST(createRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe('인증이 필요합니다.');
  });

  // ── status 검증 ─────────────────────────────

  test('status가 없으면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ recipe_id: 42, lesson_note: '기록' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('status는 SUCCESS, REGRET, FAIL 중 하나여야 합니다.');
  });

  test('status가 허용값 외 문자열이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ ...VALID_BODY, status: 'EXCELLENT' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('status는 SUCCESS, REGRET, FAIL 중 하나여야 합니다.');
  });

  // ── recipe_id 검증 ───────────────────────────

  test('recipe_id가 없으면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ status: 'SUCCESS', lesson_note: '기록' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('recipe_id는 필수입니다.');
  });

  test('recipe_id가 0이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ ...VALID_BODY, recipe_id: 0 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('recipe_id는 양의 정수여야 합니다.');
  });

  test('recipe_id가 음수이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ ...VALID_BODY, recipe_id: -1 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('recipe_id는 양의 정수여야 합니다.');
  });

  test('recipe_id가 소수이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ ...VALID_BODY, recipe_id: 1.5 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('recipe_id는 양의 정수여야 합니다.');
  });

  // ── lesson_note 검증 ─────────────────────────

  test('lesson_note가 없으면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ status: 'SUCCESS', recipe_id: 42 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('lesson_note는 필수입니다.');
  });

  test('lesson_note가 공백 문자열만이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ ...VALID_BODY, lesson_note: '   ' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('lesson_note는 필수입니다.');
  });

  // ── companion 검증 ───────────────────────────

  test('companion이 51자 이상이면 400을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);

    const res = await POST(createRequest({ ...VALID_BODY, companion: 'a'.repeat(51) }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toContain('companion은 50자 이하여야 합니다.');
  });

  // ── recipe_id 존재 여부 검증 ──────────────────

  test('recipe_id가 DB에 없으면 404를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce(null); // DB에 없음

    const res = await POST(createRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe('존재하지 않는 레시피입니다.');
  });

  // ── 성공 케이스 ──────────────────────────────

  test('필수 필드만으로 정상 요청 시 201과 log 데이터를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce(MOCK_RECIPE);
    mockLogsCreate.mockResolvedValueOnce({ ...MOCK_CREATED_LOG, companion: null });

    const res = await POST(createRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.message).toBe('요리 기록이 저장되었습니다.');
    expect(data.data.log_id).toBe(1);
  });

  test('모든 필드 정상 요청 시 201과 전체 데이터를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce(MOCK_RECIPE);
    mockLogsCreate.mockResolvedValueOnce(MOCK_CREATED_LOG);

    const res = await POST(createRequest({ ...VALID_BODY, companion: '가족' }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.companion).toBe('가족');
    expect(data.data.status).toBe('SUCCESS');
  });

  test('userId가 세션 id로 올바르게 전달된다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION); // id: '1'
    mockRecipesFindUnique.mockResolvedValueOnce(MOCK_RECIPE);
    mockLogsCreate.mockResolvedValueOnce(MOCK_CREATED_LOG);

    await POST(createRequest(VALID_BODY));

    const callArg = mockLogsCreate.mock.calls[0][0];
    expect(callArg.data.user_id).toBe(1); // "1" → parseInt → 1
  });

  test('lesson_note의 앞뒤 공백을 trim하여 저장한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce(MOCK_RECIPE);
    mockLogsCreate.mockResolvedValueOnce(MOCK_CREATED_LOG);

    await POST(createRequest({ ...VALID_BODY, lesson_note: '  앞뒤 공백  ' }));

    const callArg = mockLogsCreate.mock.calls[0][0];
    expect(callArg.data.lesson_note).toBe('앞뒤 공백');
  });

  // ── 서버 에러 ────────────────────────────────

  test('prisma.cooking_logs.create가 에러를 던지면 500을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockRecipesFindUnique.mockResolvedValueOnce(MOCK_RECIPE);
    mockLogsCreate.mockRejectedValueOnce(new Error('DB 연결 실패'));

    const res = await POST(createRequest(VALID_BODY));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe('서버 에러가 발생했습니다.');
    expect(data.error).toBe('DB 연결 실패');
  });
});
