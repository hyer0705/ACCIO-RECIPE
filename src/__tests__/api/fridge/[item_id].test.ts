import { expect, test, describe, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/fridge/route';
import { PUT, DELETE } from '@/app/api/fridge/[item_id]/route';

// ─────────────────────────────────────────────
// 1. next-auth 세션 모킹
// ─────────────────────────────────────────────
const { mockGetServerSession } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));

// ─────────────────────────────────────────────
// 2. Prisma 모킹
// ─────────────────────────────────────────────
const { mockFindMany, mockFindUnique, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    fridge_items: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

const MOCK_SESSION = { user: { id: '1', name: '루시' } };

const mockParams = (itemId: string) => ({
  params: Promise.resolve({ item_id: itemId }),
});

describe('GET /api/fridge', () => {
  beforeEach(() => vi.clearAllMocks());

  test('세션 없으면 401 반환', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  test('재료 목록과 d_day를 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindMany.mockResolvedValueOnce([
      {
        item_id: 1,
        custom_name: null,
        quantity: 2,
        unit: '개',
        expiry_date: new Date('2099-12-31'),
        ingredients_master: { name: '달걀', icon_url: null },
      },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].name).toBe('달걀');
    expect(typeof body.data[0].d_day).toBe('number');
  });

  test('유통기한 없는 항목은 d_day가 null', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindMany.mockResolvedValueOnce([
      {
        item_id: 2,
        custom_name: '직접 만든 소스',
        quantity: 1,
        unit: null,
        expiry_date: null,
        ingredients_master: null,
      },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(body.data[0].d_day).toBeNull();
    expect(body.data[0].name).toBe('직접 만든 소스');
  });
});

describe('PUT /api/fridge/[item_id]', () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = (body: unknown) =>
    new Request('http://localhost/api/fridge/1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await PUT(makeReq({}), mockParams('1'));
    expect(res.status).toBe(401);
  });

  test('item_id가 문자열이면 400', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    const res = await PUT(makeReq({}), mockParams('abc'));
    expect(res.status).toBe(400);
  });

  test('존재하지 않는 item이면 404', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await PUT(makeReq({ quantity: 3 }), mockParams('99'));
    expect(res.status).toBe(404);
  });

  test('타인의 재료면 403', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION); // userId: 1
    mockFindUnique.mockResolvedValueOnce({ item_id: 1, user_id: 2 }); // 소유자 다름
    const res = await PUT(makeReq({ quantity: 3 }), mockParams('1'));
    expect(res.status).toBe(403);
  });

  test('quantity가 음수면 400', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce({ item_id: 1, user_id: 1 });
    const res = await PUT(makeReq({ quantity: -1 }), mockParams('1'));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.errors).toContain('수량(quantity)은 0보다 큰 숫자여야 합니다.');
  });

  test('정상 요청 시 200 반환', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce({ item_id: 1, user_id: 1 });
    mockUpdate.mockResolvedValueOnce({
      item_id: 1,
      custom_name: null,
      quantity: 3,
      unit: '개',
      expiry_date: null,
    });

    const res = await PUT(makeReq({ quantity: 3 }), mockParams('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.quantity).toBe(3);
  });
});

describe('DELETE /api/fridge/[item_id]', () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = () => new Request('http://localhost/api/fridge/1', { method: 'DELETE' });

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq(), mockParams('1'));
    expect(res.status).toBe(401);
  });

  test('존재하지 않는 item이면 404', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await DELETE(makeReq(), mockParams('99'));
    expect(res.status).toBe(404);
  });

  test('타인의 재료면 403', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce({ item_id: 1, user_id: 2 });
    const res = await DELETE(makeReq(), mockParams('1'));
    expect(res.status).toBe(403);
  });

  test('정상 삭제 시 200 반환', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockFindUnique.mockResolvedValueOnce({ item_id: 1, user_id: 1 });
    mockDelete.mockResolvedValueOnce({ item_id: 1 });

    const res = await DELETE(makeReq(), mockParams('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('재료가 삭제되었습니다.');
  });
});
