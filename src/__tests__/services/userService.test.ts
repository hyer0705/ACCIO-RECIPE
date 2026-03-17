import { expect, test, describe, vi, beforeEach } from 'vitest';
import * as userService from '@/services/userService';
import prisma from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  default: {
    users: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('userService', () => {
  const userId = 1;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserProfile', () => {
    test('사용자 프로필을 가져온다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockUser: any = {
        user_id: userId,
        email: 'test@test.com',
        user_settings: { alert_timer: true },
      };
      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser);

      const result = await userService.getUserProfile(userId);
      expect(result.email).toBe('test@test.com');
      expect(result.user_settings).toBeDefined();
    });

    test('사용자가 없으면 에러를 던진다', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      await expect(userService.getUserProfile(userId)).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('deleteUser', () => {
    test('사용자를 성공적으로 삭제한다', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(prisma.users.findUnique).mockResolvedValue({ user_id: userId } as any);

      await userService.deleteUser(userId);
      expect(prisma.users.delete).toHaveBeenCalledWith({ where: { user_id: userId } });
    });

    test('존재하지 않는 사용자 삭제 시도 시 에러 발생', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);
      await expect(userService.deleteUser(999)).rejects.toThrow('NOT_FOUND');
    });
  });
});
