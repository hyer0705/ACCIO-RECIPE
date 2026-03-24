import { expect, test, describe, vi, beforeEach } from 'vitest';
import { DELETE } from '@/app/api/user/route';
import * as userService from '@/services/userService';
import { requireSessionUser } from '@/lib/auth/session';
import { cookies } from 'next/headers';
import { notFound } from '@/lib/auth/errors';

vi.mock('@/services/userService', () => ({
  deleteUser: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  requireSessionUser: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('DELETE /api/user', () => {
  const mockDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireSessionUser).mockResolvedValue({
      userId: 1,
      isComplete: true,
    });

    vi.mocked(cookies).mockResolvedValue({
      delete: mockDelete,
    } as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  test('should delete user and clear session cookies', async () => {
    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    expect(userService.deleteUser).toHaveBeenCalledWith(1);
    expect(mockDelete).toHaveBeenCalledWith('next-auth.session-token');
    expect(mockDelete).toHaveBeenCalledWith('__Secure-next-auth.session-token');
  });

  test('should return 404 if user not found', async () => {
    vi.mocked(userService.deleteUser).mockRejectedValue(notFound('존재하지 않는 사용자입니다.'));

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});
