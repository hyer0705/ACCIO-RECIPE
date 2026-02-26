import { expect, test, describe, vi, beforeEach } from 'vitest';
import { GET as getCookingLogs } from '@/app/api/cooking-logs/route';
import { PUT, DELETE } from '@/app/api/cooking-logs/[log_id]/route';

// ─────────────────────────────────────────────
// 모킹
// ─────────────────────────────────────────────
const { mockGetServerSession } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));

const { mockFindMany, mockFindUnique, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    cooking_logs: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

const MOCK_SESSION = { user: { id: '1', name: '루시' } };

const mockParams = (logId: string) => ({
  params: Promise.resolve({ log_id: logId }),
});

const makeReq = (body: unknown, method = 'PUT') =>
  new Request('http://localhost/api/cooking-logs/1', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

// ─────────────────────────────────────────────
// GET /api/cooking-logs
// ─────────────────────────────────────────────
describe('GET /api/cooking-logs', () => {
  beforeEach(() => vi.clearAllMocks());

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await getCookingLogs();
    expect(res.status).toBe(401);
  });

  test('요리 기록 목록과 recipe_title을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindMany.mockResolvedValueOnce([
      {
        log_id: 1,
        recipe_id: 10,
        status: 'SUCCESS',
        lesson_note: '맛있었다',
        companion: '가족',
        cooked_at: new Date('2026-02-20'),
        recipes: { title: '김치찌개' },
      },
    ]);

    const res = await getCookingLogs();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].recipe_title).toBe('김치찌개');
    expect(body.data[0].status).toBe('SUCCESS');
  });
});

// ─────────────────────────────────────────────
// PUT /api/cooking-logs/[log_id]
// ─────────────────────────────────────────────
describe('PUT /api/cooking-logs/[log_id]', () => {
  beforeEach(() => vi.clearAllMocks());

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await PUT(makeReq({}), mockParams('1'));
    expect(res.status).toBe(401);
  });

  test('log_id가 문자이면 400', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    const res = await PUT(makeReq({}), mockParams('abc'));
    expect(res.status).toBe(400);
  });

  test('존재하지 않는 log이면 404', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PUT(makeReq({ lesson_note: '메모' }), mockParams('99'));
    expect(res.status).toBe(404);
  });

  test('타인의 기록이면 403', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION); // userId: 1
    mockFindUnique.mockResolvedValueOnce({ log_id: 1, user_id: 2 });
    const res = await PUT(makeReq({ lesson_note: '메모' }), mockParams('1'));
    expect(res.status).toBe(403);
  });

  test('잘못된 status이면 400', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce({ log_id: 1, user_id: 1 });
    const res = await PUT(makeReq({ status: 'WRONG' }), mockParams('1'));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.errors[0]).toContain('SUCCESS, REGRET, FAIL');
  });

  test('lesson_note가 빈 문자열이면 400', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce({ log_id: 1, user_id: 1 });
    const res = await PUT(makeReq({ lesson_note: '  ' }), mockParams('1'));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.errors[0]).toContain('lesson_note');
  });

  test('정상 요청 시 200 반환', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce({ log_id: 1, user_id: 1 });
    mockUpdate.mockResolvedValueOnce({
      log_id: 1,
      recipe_id: 5,
      status: 'SUCCESS',
      lesson_note: '수정된 메모',
      companion: null,
      cooked_at: new Date(),
    });

    const res = await PUT(makeReq({ lesson_note: '수정된 메모' }), mockParams('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.lesson_note).toBe('수정된 메모');
  });
});

// ─────────────────────────────────────────────
// DELETE /api/cooking-logs/[log_id]
// ─────────────────────────────────────────────
describe('DELETE /api/cooking-logs/[log_id]', () => {
  beforeEach(() => vi.clearAllMocks());

  const makeDeleteReq = () =>
    new Request('http://localhost/api/cooking-logs/1', { method: 'DELETE' });

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteReq(), mockParams('1'));
    expect(res.status).toBe(401);
  });

  test('존재하지 않는 log이면 404', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await DELETE(makeDeleteReq(), mockParams('99'));
    expect(res.status).toBe(404);
  });

  test('타인의 기록이면 403', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce({ log_id: 1, user_id: 2 });
    const res = await DELETE(makeDeleteReq(), mockParams('1'));
    expect(res.status).toBe(403);
  });

  test('정상 삭제 시 200 반환', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce({ log_id: 1, user_id: 1 });
    mockDelete.mockResolvedValueOnce({ log_id: 1 });

    const res = await DELETE(makeDeleteReq(), mockParams('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('요리 기록이 삭제되었습니다.');
  });
});
