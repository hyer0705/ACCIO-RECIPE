import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GET } from '@/app/api/ingredients/master/route';

const { mockGetServerSession } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
}));

const { mockSearchMasterIngredients } = vi.hoisted(() => ({
  mockSearchMasterIngredients: vi.fn(),
}));

vi.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@/lib/authOptions', () => ({
  authOptions: {},
}));

vi.mock('@/services/ingredientService', () => ({
  searchMasterIngredients: mockSearchMasterIngredients,
}));

const MOCK_SESSION = { user: { id: '1', name: '루시' } };

describe('GET /api/ingredients/master', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('세션이 없으면 401을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);

    const res = await GET(new Request('http://localhost/api/ingredients/master?q=egg'));

    expect(res.status).toBe(401);
  });

  test('검색어와 함께 마스터 식재료 목록을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSearchMasterIngredients.mockResolvedValueOnce([
      {
        master_id: 1,
        name: '달걀',
        category: '계란류',
        icon_url: null,
        default_unit: '개',
      },
    ]);

    const res = await GET(new Request('http://localhost/api/ingredients/master?q=egg'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockSearchMasterIngredients).toHaveBeenCalledWith('egg');
    expect(body.success).toBe(true);
    expect(body.data[0].name).toBe('달걀');
  });

  test('검색어가 없어도 전체 목록 조회 요청을 처리한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSearchMasterIngredients.mockResolvedValueOnce([]);

    const res = await GET(new Request('http://localhost/api/ingredients/master'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockSearchMasterIngredients).toHaveBeenCalledWith('');
    expect(body.data).toEqual([]);
  });

  test('서비스 예외 발생 시 500을 반환한다', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockSearchMasterIngredients.mockRejectedValueOnce(new Error('DB exploded'));

    const res = await GET(new Request('http://localhost/api/ingredients/master?q=egg'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.message).toBe('서버 에러가 발생했습니다.');
  });
});
