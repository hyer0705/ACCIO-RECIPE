import { expect, test, describe, vi, beforeEach } from 'vitest';
import { DELETE as deleteUser } from '@/app/api/user/route';
import { Prisma } from '@/generated/client/client';

// ─────────────────────────────────────────────
// 모킹
// ─────────────────────────────────────────────
const { mockGetServerSession } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));

const { mockUsersFindUnique, mockUsersDelete, mockCookiesDelete } = vi.hoisted(() => ({
  mockUsersFindUnique: vi.fn(),
  mockUsersDelete: vi.fn(),
  mockCookiesDelete: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    users: {
      findUnique: mockUsersFindUnique,
      delete: mockUsersDelete,
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    delete: mockCookiesDelete,
  })),
}));

const MOCK_SESSION = { user: { id: '1', name: '루시' } };

// ─────────────────────────────────────────────
// DELETE /api/user
// ─────────────────────────────────────────────
describe('DELETE /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersFindUnique.mockResolvedValue({ user_id: 1 });
  });

  test('세션 없으면 401', async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    const res = await deleteUser();
    expect(res.status).toBe(401);
  });

  test('존재하지 않는 유저이면 404', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockUsersDelete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Record to delete does not exist.', {
        code: 'P2025',
        clientVersion: '7.4.2',
      }),
    );
    const res = await deleteUser();
    expect(res.status).toBe(404);
  });

  test('회원 탈퇴 성공 시 200', async () => {
    mockGetServerSession.mockResolvedValueOnce(MOCK_SESSION);
    mockUsersFindUnique.mockResolvedValueOnce({ user_id: 1 });
    mockUsersDelete.mockResolvedValueOnce({ user_id: 1 });

    const res = await deleteUser();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe('회원 탈퇴가 완료되었습니다.');
    expect(mockUsersDelete).toHaveBeenCalledWith({ where: { user_id: 1 } });
    expect(mockCookiesDelete).toHaveBeenCalledWith('next-auth.session-token');
    expect(mockCookiesDelete).toHaveBeenCalledWith('__Secure-next-auth.session-token');
  });
});
